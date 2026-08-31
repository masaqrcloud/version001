import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      tableSessionId: guest.tableSessionId,
      status: { not: "CANCELLED" },
    },
    include: {
      items: { include: { options: true } },
      guest: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const guests = await prisma.guest.findMany({
    where: {
      tableSessionId: guest.tableSessionId,
      NOT: { nickname: null },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines = orders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      guestId: order.guestId,
      guestName: order.guest.nickname || "Misafir",
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      note: item.note,
      options: item.options.map((option) => option.name),
      status: order.status,
    })),
  );

  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  return NextResponse.json({
    currentGuestId: guest.id,
    guests: guests
      .filter((g) => Boolean(g.nickname?.trim()))
      .map((g) => ({
        id: g.id,
        nickname: g.nickname as string,
        isMe: g.id === guest.id,
      })),
    lines,
    total,
  });
}
