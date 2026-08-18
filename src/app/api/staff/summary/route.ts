import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istanbulDayBounds } from "@/lib/day";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 400 });
  }

  const { start, end, day } = istanbulDayBounds();
  const venueFilter = { table: { venueId: user.venueId } };

  const [closed, open, orders] = await Promise.all([
    prisma.tableSession.findMany({
      where: {
        ...venueFilter,
        status: "CLOSED",
        closedAt: { gte: start, lte: end },
      },
      include: {
        table: true,
        bill: true,
        orders: { include: { items: true, guest: true } },
      },
      orderBy: { closedAt: "desc" },
    }),
    prisma.tableSession.findMany({
      where: { ...venueFilter, status: "OPEN" },
      include: {
        table: true,
        guests: true,
        orders: { include: { items: true } },
      },
    }),
    prisma.order.findMany({
      where: {
        tableSession: venueFilter,
        createdAt: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
      include: { items: true },
    }),
  ]);

  const paidTotal = closed.reduce((sum, session) => {
    if (session.bill && session.bill.status === "PAID") {
      return sum + Number(session.bill.total);
    }
    return (
      sum +
      session.orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce(
          (s, order) =>
            s +
            order.items.reduce((n, item) => n + Number(item.price) * item.quantity, 0),
          0,
        )
    );
  }, 0);

  const openTotal = open.reduce(
    (sum, session) =>
      sum +
      session.orders
        .filter((order) => order.status !== "CANCELLED")
        .reduce(
          (s, order) =>
            s +
            order.items.reduce((n, item) => n + Number(item.price) * item.quantity, 0),
          0,
        ),
    0,
  );

  const itemMap = new Map<string, { name: string; quantity: number; total: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = itemMap.get(item.name) ?? {
        name: item.name,
        quantity: 0,
        total: 0,
      };
      current.quantity += item.quantity;
      current.total += Number(item.price) * item.quantity;
      itemMap.set(item.name, current);
    }
  }

  const topItems = [...itemMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  return NextResponse.json({
    day,
    paidTotal,
    openTotal,
    closedCount: closed.length,
    openCount: open.length,
    orderCount: orders.length,
    itemCount: orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0,
    ),
    topItems,
    openTables: open.map((session) => ({
      id: session.id,
      tableNumber: session.table.number,
      guests: session.guests.filter((guest) => guest.nickname?.trim()).length,
    })),
    closedTables: closed.map((session) => ({
      id: session.id,
      tableNumber: session.table.number,
      total:
        session.bill && Number(session.bill.total) > 0
          ? Number(session.bill.total)
          : 0,
      closedAt: session.closedAt,
    })),
  });
}
