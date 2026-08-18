import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateOpenSession } from "@/lib/guest";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.tableSession.findFirst({
    where: { id, table: { venueId: user.venueId } },
    select: { id: true, tableId: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 404 });
  }
  const sessionId =
    existing.status === "OPEN"
      ? (await getOrCreateOpenSession(existing.tableId)).id
      : existing.id;

  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, table: { venueId: user.venueId } },
    include: {
      table: true,
      guests: { orderBy: { createdAt: "asc" } },
      orders: {
        include: { items: true, guest: true },
        orderBy: { createdAt: "asc" },
      },
      bill: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 404 });
  }

  const others = await prisma.tableSession.findMany({
    where: {
      status: "OPEN",
      id: { not: session.id },
      table: { venueId: user.venueId },
    },
    include: { table: true },
    orderBy: { openedAt: "asc" },
  });

  const active = session.orders.filter((o) => o.status !== "CANCELLED");
  const total = active.reduce(
    (sum, order) =>
      sum +
      order.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0),
    0,
  );

  return NextResponse.json({
    id: session.id,
    status: session.status,
    tableNumber: session.table.number,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    waiterCalledAt: session.waiterCalledAt,
    otherTables: others.map((item) => ({
      id: item.id,
      tableNumber: item.table.number,
    })),
    total,
    bill: session.bill
      ? { status: session.bill.status, total: Number(session.bill.total) }
      : null,
    guests: session.guests.map((g) => ({
      id: g.id,
      nickname: g.nickname || "Misafir",
    })),
    orders: session.orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      guestName: order.guestName || order.guest.nickname || "Misafir",
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        note: item.note,
      })),
    })),
  });
}
