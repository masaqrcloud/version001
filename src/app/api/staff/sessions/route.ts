import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatTableGroup } from "@/lib/table-groups";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN", "WAITER"]);
  if (error) return error;

  const sessions = await prisma.tableSession.findMany({
    where: {
      status: "OPEN",
      table: { venueId: user.venueId },
    },
    include: {
      table: true,
      mergedTables: { select: { number: true } },
      guests: { select: { nickname: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: {
          status: true,
          items: { select: { price: true, quantity: true } },
        },
      },
    },
    orderBy: { openedAt: "asc" },
  });

  const byTable = new Map<
    string,
    {
      session: (typeof sessions)[number];
      guests: (typeof sessions)[number]["guests"];
      orders: (typeof sessions)[number]["orders"];
    }
  >();
  for (const session of sessions) {
    const current = byTable.get(session.tableId);
    if (!current) {
      byTable.set(session.tableId, {
        session,
        guests: [...session.guests],
        orders: [...session.orders],
      });
      continue;
    }
    current.guests.push(...session.guests);
    current.orders.push(...session.orders);
    if (session.waiterCalledAt && !current.session.waiterCalledAt) {
      current.session = { ...current.session, waiterCalledAt: session.waiterCalledAt };
    }
  }

  return NextResponse.json({
    sessions: [...byTable.values()]
      .sort((a, b) => {
        if (a.session.waiterCalledAt && !b.session.waiterCalledAt) return -1;
        if (!a.session.waiterCalledAt && b.session.waiterCalledAt) return 1;
        return a.session.openedAt.getTime() - b.session.openedAt.getTime();
      })
      .map(({ session, guests, orders }) => {
        const pending = orders.filter(
          (order) =>
            order.status === "PENDING" ||
            order.status === "PREPARING" ||
            order.status === "READY",
        ).length;
        const total = orders.reduce(
          (sum, order) =>
            sum +
            order.items.reduce(
              (s, item) => s + Number(item.price) * item.quantity,
              0,
            ),
          0,
        );

        return {
          id: session.id,
          tableNumber: formatTableGroup(
            session.table.number,
            session.mergedTables.map((table) => table.number),
          ),
          openedAt: session.openedAt,
          waiterCalledAt: session.waiterCalledAt,
          guestCount: guests.length,
          orderCount: orders.length,
          pendingCount: pending,
          total,
        };
      }),
  });
}
