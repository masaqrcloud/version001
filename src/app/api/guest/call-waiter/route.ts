import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyGuest } from "@/lib/notify";

export async function POST() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  try {
    const calledAt = guest.tableSession.waiterCalledAt;
    if (calledAt && Date.now() - calledAt.getTime() < 90_000) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "Garson zaten çağrıldı, biraz bekle.",
      });
    }

    await prisma.tableSession.update({
      where: { id: guest.tableSessionId },
      data: { waiterCalledAt: new Date() },
    });

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

    return NextResponse.json({
      ok: true,
      already: false,
      message: "Garson çağrıldı.",
    });
  } catch (error) {
    console.error("Garson çağrılamadı", error);
    return NextResponse.json(
      { error: "Garson çağrılamadı, sayfayı yenile" },
      { status: 500 },
    );
  }
}
