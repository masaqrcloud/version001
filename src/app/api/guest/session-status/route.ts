import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGuestFromCookie } from "@/lib/guest";

export async function GET() {
  const guest = await getGuestFromCookie();
  if (!guest) {
    return NextResponse.json({ error: "Misafir bulunamadı" }, { status: 401 });
  }
  if (guest.tableSession.status === "OPEN") {
    return NextResponse.json({ closed: false });
  }

  const [orders, feedback] = await Promise.all([
    prisma.order.findMany({
      where: { guestId: guest.id, status: { not: "CANCELLED" } },
      include: { items: { include: { options: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sessionFeedback.findUnique({
      where: {
        tableSessionId_guestId: {
          tableSessionId: guest.tableSessionId,
          guestId: guest.id,
        },
      },
    }),
  ]);
  const lines = orders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price),
      options: item.options.map((option) => option.name),
    })),
  );
  return NextResponse.json({
    closed: true,
    sessionId: guest.tableSessionId,
    venueName: guest.tableSession.table.venue.name,
    tableNumber: guest.tableSession.table.number,
    closedAt: guest.tableSession.closedAt,
    receiptSent: Boolean(guest.receiptSentAt),
    feedbackSubmitted: Boolean(feedback),
    lines,
    total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  });
}
