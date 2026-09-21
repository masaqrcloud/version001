import { prisma } from "@/lib/db";
import { istanbulDayBounds } from "@/lib/day";

export type VenueSummary = Awaited<ReturnType<typeof venueSummary>>;

const istanbulDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const istanbulWeekday = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  weekday: "short",
});

function sessionRevenue(session: {
  bill: { status: string; total: unknown } | null;
  orders: { status: string; items: { price: unknown; quantity: number }[] }[];
}) {
  if (session.bill && session.bill.status === "PAID") {
    return Number(session.bill.total);
  }
  return session.orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (n, item) => n + Number(item.price) * item.quantity,
          0,
        ),
      0,
    );
}

/**
 * Son N günün günlük cirosu; e-postadaki kolon grafiğini besler.
 * Günler Istanbul saatine göre gruplanır.
 */
export async function venueRevenueTrend(venueId: string, days = 7) {
  const today = istanbulDayBounds();
  const start = new Date(
    today.start.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
  );
  const sessions = await prisma.tableSession.findMany({
    where: {
      table: { venueId },
      status: "CLOSED",
      closedAt: { gte: start, lte: today.end },
    },
    select: {
      closedAt: true,
      bill: { select: { status: true, total: true } },
      orders: {
        select: { status: true, items: { select: { price: true, quantity: true } } },
      },
    },
  });

  const buckets = new Map<string, { total: number; sessions: number }>();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.set(istanbulDay.format(date), { total: 0, sessions: 0 });
  }
  for (const session of sessions) {
    if (!session.closedAt) continue;
    const key = istanbulDay.format(session.closedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += sessionRevenue(session);
    bucket.sessions += 1;
  }

  return [...buckets.entries()].map(([day, bucket]) => ({
    day,
    label: istanbulWeekday.format(new Date(`${day}T12:00:00+03:00`)),
    total: bucket.total,
    sessions: bucket.sessions,
  }));
}

/** Eşiğin altına inmiş veya tükenmiş stok kalemleri. */
export async function venueLowStock(venueId: string) {
  const items = await prisma.menuItem.findMany({
    where: { category: { venueId }, stockTracked: true },
    select: {
      name: true,
      stockQuantity: true,
      lowStockThreshold: true,
      available: true,
    },
    orderBy: { stockQuantity: "asc" },
  });
  return items
    .filter((item) => item.stockQuantity <= item.lowStockThreshold)
    .slice(0, 12);
}

/** Gün içindeki yorumlar; düşük puanlar e-postada ayrıca vurgulanır. */
export async function venueDayFeedback(venueId: string) {
  const { start, end } = istanbulDayBounds();
  return prisma.sessionFeedback.findMany({
    where: {
      tableSession: { table: { venueId } },
      createdAt: { gte: start, lte: end },
    },
    select: { rating: true, comment: true, createdAt: true },
    orderBy: [{ rating: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
}

/**
 * Gün sonu raporu. Hem personel ekranı (/api/staff/summary) hem de akşam
 * gönderilen özet e-postası aynı hesaplamayı kullanır.
 */
export async function venueSummary(venueId: string, days = 1) {
  const today = istanbulDayBounds();
  const start = new Date(
    today.start.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
  );
  const { end, day } = today;
  const venueFilter = { table: { venueId } };

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
  const cancelledOrders = orders.filter(
    (order) => order.status === "CANCELLED",
  );

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
            order.items.reduce(
              (n, item) => n + Number(item.price) * item.quantity,
              0,
            ),
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
            order.items.reduce(
              (n, item) => n + Number(item.price) * item.quantity,
              0,
            ),
          0,
        ),
    0,
  );

  const itemMap = new Map<
    string,
    { name: string; quantity: number; total: number }
  >();
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
      const ready = order.statusEvents.find(
        (event) => event.toStatus === "READY",
      );
      return ready ? ready.createdAt.getTime() - order.createdAt.getTime() : null;
    })
    .filter((value): value is number => value !== null && value >= 0);
  const tableDurations = closed
    .filter((session) => session.closedAt)
    .map((session) => session.closedAt!.getTime() - session.openedAt.getTime())
    .filter((value) => value >= 0);
  const cancelReasonMap = new Map<string, number>();
  for (const order of cancelledOrders) {
    const reason = order.cancelReason?.trim() || "Neden belirtilmedi";
    cancelReasonMap.set(reason, (cancelReasonMap.get(reason) ?? 0) + 1);
  }

  return {
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
        ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
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
  };
}
