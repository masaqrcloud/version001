import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyGuest } from "@/lib/notify";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";

const BILL_COOLDOWN_MS = 5 * 60 * 1000;

export async function POST() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  try {
    const now = new Date();
    const cooldownUntil = guest.billRequestedAt
      ? new Date(guest.billRequestedAt.getTime() + BILL_COOLDOWN_MS)
      : null;
    if (cooldownUntil && cooldownUntil > now) {
      return NextResponse.json(
        {
          error: "Hesap isteğin iletildi. Biraz sonra tekrar deneyebilirsin.",
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
            { billRequestedAt: null },
            {
              billRequestedAt: {
                lte: new Date(now.getTime() - BILL_COOLDOWN_MS),
              },
            },
          ],
        },
        data: { billRequestedAt: now },
      });
      if (updated.count !== 1) return false;
      await tx.tableSession.update({
        where: { id: guest.tableSessionId },
        data: { billRequestedAt: now },
      });
      return true;
    });
    if (!claimed) {
      const currentGuest = await prisma.guest.findUnique({
        where: { id: guest.id },
        select: { billRequestedAt: true },
      });
      return NextResponse.json(
        {
          error: "Hesap isteğin iletildi. Biraz sonra tekrar deneyebilirsin.",
          cooldownUntil: currentGuest?.billRequestedAt
            ? new Date(
                currentGuest.billRequestedAt.getTime() + BILL_COOLDOWN_MS,
              ).toISOString()
            : undefined,
        },
        { status: 429 },
      );
    }

    try {
      await notifyGuest(
        guest.id,
        "Hesap isteniyor",
        "Garson hesabınla masaya gelecek.",
      );
    } catch {
      // bildirim olmasa da istek gider
    }
    void pushToVenueRoles(
      guest.tableSession.table.venueId,
      ["PLATFORM", "OWNER", "ADMIN", "WAITER"],
      {
        title: "Hesap isteniyor",
        body: `${tableLabel(guest.tableSession.table.number)} hesabı istiyor`,
        url: `/staff/waiter/${guest.tableSessionId}`,
        tag: `bill-${guest.tableSessionId}`,
      },
    );

    return NextResponse.json({
      ok: true,
      message: "Hesap isteğin garsona iletildi.",
      cooldownUntil: new Date(now.getTime() + BILL_COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    console.error("Hesap istenemedi", error);
    return NextResponse.json(
      { error: "Hesap istenemedi, sayfayı yenile" },
      { status: 500 },
    );
  }
}
