import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istanbulDayBounds } from "@/lib/day";
import { getStaffUser } from "@/lib/tenant";

export async function GET(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 400 });
  }

  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 1;
  const today = istanbulDayBounds();
  const start = new Date(today.start.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const { end, day } = today;
  const venueFilter = { table: { venueId: user.venueId } };

  const [closed, open, orders, feedback] = await Promise.all([
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
      },
      include: {
        items: true,
        statusEvents: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.sessionFeedback.findMany({
      where: {
        tableSession: venueFilter,
        createdAt: { gte: start, lte: end },
      },
    }),
  ]);
  const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
  const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");

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
  for (const order of activeOrders) {
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
  const preparationTimes = activeOrders
    .map((order) => {
      const ready = order.statusEvents.find((event) => event.toStatus === "READY");
      return ready ? ready.createdAt.getTime() - order.createdAt.getTime() : null;
    })
    .filter((value): value is number => value !== null && value >= 0);
  const tableDurations = closed
    .filter((session) => session.closedAt)
    .map(
      (session) =>
        session.closedAt!.getTime() - session.openedAt.getTime(),
    )
    .filter((value) => value >= 0);
  const cancelReasonMap = new Map<string, number>();
  for (const order of cancelledOrders) {
    const reason = order.cancelReason?.trim() || "Neden belirtilmedi";
    cancelReasonMap.set(reason, (cancelReasonMap.get(reason) ?? 0) + 1);
  }

  return NextResponse.json({
    day,
    days,
    paidTotal,
    openTotal,
    closedCount: closed.length,
    openCount: open.length,
    orderCount: activeOrders.length,
    itemCount: activeOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0,
    ),
    topItems,
    cancellationCount: cancelledOrders.length,
    cancellationRate:
      orders.length > 0 ? cancelledOrders.length / orders.length : 0,
    cancellationReasons: [...cancelReasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    averagePreparationMinutes:
      preparationTimes.length > 0
        ? preparationTimes.reduce((sum, value) => sum + value, 0) /
          preparationTimes.length /
          60000
        : null,
    averageTableMinutes:
      tableDurations.length > 0
        ? tableDurations.reduce((sum, value) => sum + value, 0) /
          tableDurations.length /
          60000
        : null,
    averageRating:
      feedback.length > 0
        ? feedback.reduce((sum, item) => sum + item.rating, 0) /
          feedback.length
        : null,
    feedbackCount: feedback.length,
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
