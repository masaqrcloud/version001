import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const tables = await prisma.table.findMany({
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
        },
      },
    },
    orderBy: { number: "asc" },
  });

  const floor = tables.map((table) => {
    const guests = table.sessions.flatMap((session) => session.guests);
    const orders = table.sessions.flatMap((session) => session.orders);
    const waiterCalledAt = table.sessions.reduce<Date | null>(
      (latest, session) =>
        session.waiterCalledAt &&
        (!latest || session.waiterCalledAt > latest)
          ? session.waiterCalledAt
          : latest,
      null,
    );
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
      occupied: table.sessions.length > 0,
      sessionId: table.sessions[0]?.id ?? null,
      guestCount: guests.length,
      orderCount: orders.length,
      pendingCount: orders.filter((order) =>
        ["PENDING", "PREPARING", "READY"].includes(order.status),
      ).length,
      waiterCalledAt,
      total,
    };
  });

  return NextResponse.json({
    tables: floor,
    summary: {
      total: floor.length,
      occupied: floor.filter((table) => table.occupied).length,
      available: floor.filter((table) => !table.occupied).length,
      guests: floor.reduce((sum, table) => sum + table.guestCount, 0),
    },
  });
}
