import "server-only";
import webpush from "web-push";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

type StaffPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:masaqr.cloud@gmail.com",
    publicKey,
    privateKey,
  );
  return true;
}

export async function pushToVenueRoles(
  venueId: string,
  roles: Role[],
  payload: StaffPushPayload,
) {
  if (!configured()) return;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        venueId,
        role: { in: roles },
      },
    },
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
          { TTL: 120 },
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
          return;
        }
        console.error("Personel push bildirimi gönderilemedi", error);
      }
    }),
  );
}
