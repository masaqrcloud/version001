import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateOpenSession } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
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
        const rank = (session: (typeof sessions)[number]) => {
          if (session.billRequestedAt) return 0;
          if (session.waiterCalledAt) return 1;
          if (
            session.orders.some(
              (order) =>
                order.status === "PENDING" ||
                order.status === "PREPARING" ||
                order.status === "READY",
            )
          ) {
            return 2;
          }
          return 3;
        };
        const byNeed = rank(a.session) - rank(b.session);
        if (byNeed !== 0) return byNeed;
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
          billRequestedAt: session.billRequestedAt,
          guestCount: guests.filter(
            (guest) => !isStaffProxyNickname(guest.nickname),
          ).length,
          orderCount: orders.length,
          pendingCount: pending,
          total,
        };
      }),
  });
}

export async function POST(request: Request) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const body = z
    .object({ tableId: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Masa seç" }, { status: 400 });
  }

  const table = await prisma.table.findFirst({
    where: { id: body.data.tableId, venueId: user.venueId },
    select: { id: true },
  });
  if (!table) {
    return NextResponse.json({ error: "Masa yok" }, { status: 404 });
  }

  const session = await getOrCreateOpenSession(table.id);
  return NextResponse.json({ id: session.id, tableId: table.id });
}
