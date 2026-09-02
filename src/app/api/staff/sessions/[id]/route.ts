import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateOpenSession } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { formatTableGroup } from "@/lib/table-groups";
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
      mergedTables: { orderBy: { number: "asc" } },
      guests: { orderBy: { createdAt: "asc" } },
      orders: {
        include: {
          items: { include: { options: true } },
          guest: true,
        },
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
    include: { table: true, mergedTables: true },
    orderBy: { openedAt: "asc" },
  });
  const venueTables = await prisma.table.findMany({
    where: { venueId: user.venueId },
    include: {
      sessions: { where: { status: "OPEN" }, take: 1 },
      mergedSession: { select: { id: true, status: true } },
    },
    orderBy: { number: "asc" },
  });
  const busyTableIds = new Set<string>();
  for (const item of venueTables) {
    if (item.sessions[0]) busyTableIds.add(item.id);
    if (item.mergedSessionId && item.mergedSession?.status === "OPEN") {
      busyTableIds.add(item.id);
    }
  }
  const groupedIds = new Set([
    session.tableId,
    ...session.mergedTables.map((table) => table.id),
  ]);

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
    tableNumber: formatTableGroup(
      session.table.number,
      session.mergedTables.map((table) => table.number),
    ),
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    waiterCalledAt: session.waiterCalledAt,
    billRequestedAt: session.billRequestedAt,
    mergedTables: session.mergedTables.map((table) => ({
      id: table.id,
      number: table.number,
    })),
    otherTables: others.map((item) => ({
      id: item.id,
      tableNumber: formatTableGroup(
        item.table.number,
        item.mergedTables.map((table) => table.number),
      ),
    })),
    mergeTargets: venueTables
      .filter((table) => !groupedIds.has(table.id))
      .map((table) => ({
        id: table.id,
        number: table.number,
        occupied: busyTableIds.has(table.id),
      })),
    transferTargets: venueTables
      .filter((table) => !busyTableIds.has(table.id) && table.id !== session.tableId)
      .map((table) => ({
        id: table.id,
        number: table.number,
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
      guestName:
        isStaffProxyNickname(order.guestName) ||
        isStaffProxyNickname(order.guest.nickname)
          ? "Garson yazdı"
          : order.guestName || order.guest.nickname || "Misafir",
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        note: item.note,
        options: item.options.map((option) => option.name),
      })),
    })),
  });
}
