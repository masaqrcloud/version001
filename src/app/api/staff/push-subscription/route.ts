import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { FLOOR_ROLES, getStaffUser } from "@/lib/tenant";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(FLOOR_ROLES);
  if (error) return error;
  const body = subscriptionSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz bildirim aboneliği" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.data.endpoint },
    create: {
      userId: user.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    },
    update: {
      userId: user.id,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await getStaffUser(FLOOR_ROLES);
  if (error) return error;
  const body = z
    .object({ endpoint: z.string().url().max(2000) })
    .safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz abonelik" }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.data.endpoint, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
