import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyGuest } from "@/lib/notify";
import { pushToVenueRoles } from "@/lib/staff-push";

const WAITER_COOLDOWN_MS = 10 * 60 * 1000;

export async function POST() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  try {
    const now = new Date();
    const cooldownUntil = guest.waiterCalledAt
      ? new Date(guest.waiterCalledAt.getTime() + WAITER_COOLDOWN_MS)
      : null;
    if (cooldownUntil && cooldownUntil > now) {
      return NextResponse.json(
        {
          error: "Garson zaten çağrıldı. Tekrar çağırmak için biraz bekle.",
          cooldownUntil: cooldownUntil.toISOString(),
        },
        { status: 429 },
      );
    }

    const claimed = await prisma.$transaction(async (tx) => {
      const updated = await tx.guest.updateMany({
        where: {
          id: guest.id,
          OR: [
            { waiterCalledAt: null },
            {
              waiterCalledAt: {
                lte: new Date(now.getTime() - WAITER_COOLDOWN_MS),
              },
            },
          ],
        },
        data: { waiterCalledAt: now },
      });
      if (updated.count !== 1) return false;

      await tx.tableSession.update({
        where: { id: guest.tableSessionId },
        data: { waiterCalledAt: now },
      });
      return true;
    });
    if (!claimed) {
      const currentGuest = await prisma.guest.findUnique({
        where: { id: guest.id },
        select: { waiterCalledAt: true },
      });
      const currentCooldownUntil = currentGuest?.waiterCalledAt
        ? new Date(
            currentGuest.waiterCalledAt.getTime() + WAITER_COOLDOWN_MS,
          ).toISOString()
        : undefined;
      return NextResponse.json(
        {
          error: "Garson zaten çağrıldı. Tekrar çağırmak için biraz bekle.",
          cooldownUntil: currentCooldownUntil,
        },
        { status: 429 },
      );
    }

    const who = guest.nickname?.trim() || "Masa";
    try {
      await notifyGuest(
        guest.id,
        "Garson çağrıldı",
        `${who}, garson masaya geliyor.`,
      );
    } catch {
      // bildirim olmasa da çağrı gider
    }
    void pushToVenueRoles(
      guest.tableSession.table.venueId,
      ["PLATFORM", "OWNER", "ADMIN", "WAITER"],
      {
        title: "Garson çağrısı",
        body: `Masa ${guest.tableSession.table.number} garson çağırıyor`,
        url: `/staff/waiter/${guest.tableSessionId}`,
        tag: `waiter-${guest.tableSessionId}`,
      },
    );

    return NextResponse.json({
      ok: true,
      message: "Garson çağrıldı.",
      cooldownUntil: new Date(
        now.getTime() + WAITER_COOLDOWN_MS,
      ).toISOString(),
    });
  } catch (error) {
    console.error("Garson çağrılamadı", error);
    return NextResponse.json(
      { error: "Garson çağrılamadı, sayfayı yenile" },
      { status: 500 },
    );
  }
}
