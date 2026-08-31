import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istanbulToday } from "@/lib/reservation-occupancy";
import { formatTableGroup } from "@/lib/table-groups";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const [tables, todayReservations] = await Promise.all([
    prisma.table.findMany({
      where: { venueId: user.venueId },
      include: {
        sessions: {
          where: { status: "OPEN" },
          orderBy: { openedAt: "asc" },
          include: {
            guests: { select: { id: true } },
            orders: {
              where: { status: { not: "CANCELLED" } },
              select: {
                status: true,
                items: { select: { price: true, quantity: true } },
              },
            },
            mergedTables: { select: { id: true, number: true } },
          },
        },
        mergedSession: {
          include: {
            table: { select: { id: true, number: true } },
            guests: { select: { id: true } },
            orders: {
              where: { status: { not: "CANCELLED" } },
              select: {
                status: true,
                items: { select: { price: true, quantity: true } },
              },
            },
            mergedTables: { select: { id: true, number: true } },
          },
        },
      },
      orderBy: { number: "asc" },
    }),
    prisma.reservation.findMany({
      where: {
        venueId: user.venueId,
        reservationDate: istanbulToday(),
        tableId: { not: null },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { tableId: true },
    }),
  ]);
  const reservedIds = new Set(
    todayReservations.map((item) => item.tableId).filter(Boolean),
  );

  const floor = tables.map((table) => {
    const home = table.sessions[0] ?? null;
    const host =
      !home && table.mergedSession?.status === "OPEN"
        ? table.mergedSession
        : null;
    const session = home ?? host;
    const extraNumbers = session
      ? "mergedTables" in session
        ? session.mergedTables.map((item) => item.number)
        : []
      : [];
    const primaryNumber = home
      ? table.number
      : host?.table.number ?? table.number;
    const guests = session?.guests ?? [];
    const orders = session?.orders ?? [];
    const total = orders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (orderTotal, item) =>
            orderTotal + Number(item.price) * item.quantity,
          0,
        ),
      0,
    );

    return {
      id: table.id,
      number: table.number,
      floorX: table.floorX,
      floorY: table.floorY,
      occupied: Boolean(session),
      reserved: reservedIds.has(table.id),
      sessionId: session?.id ?? null,
      primaryTableId: home ? table.id : host?.table.id ?? null,
      mergedLabel: session
        ? formatTableGroup(primaryNumber, extraNumbers)
        : null,
      isMerged: extraNumbers.length > 0,
      isPrimary: Boolean(home),
      guestCount: guests.length,
      orderCount: orders.length,
      pendingCount: orders.filter((order) =>
        ["PENDING", "PREPARING", "READY"].includes(order.status),
      ).length,
      waiterCalledAt: session?.waiterCalledAt ?? null,
      billRequestedAt: session?.billRequestedAt ?? null,
      total,
    };
  });

  const counted = new Set<string>();
  let uniqueGuests = 0;
  for (const table of floor) {
    if (!table.sessionId || counted.has(table.sessionId)) continue;
    counted.add(table.sessionId);
    uniqueGuests += table.guestCount;
  }

  return NextResponse.json({
    tables: floor,
    summary: {
      total: floor.length,
      occupied: floor.filter((table) => table.occupied || table.reserved).length,
      available: floor.filter((table) => !table.occupied && !table.reserved)
        .length,
      guests: uniqueGuests,
    },
  });
}
