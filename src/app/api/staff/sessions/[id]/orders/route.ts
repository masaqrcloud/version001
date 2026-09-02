import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateStaffProxyGuest } from "@/lib/guest";
import { consumeStockForOrder } from "@/lib/stock";
import { resolveStaffOrderLines, staffOrderItemSchema } from "@/lib/staff-order-lines";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const { id } = await context.params;
  const body = z
    .object({ items: z.array(staffOrderItemSchema).min(1).max(40) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Sipariş kalemi seç" }, { status: 400 });
  }

  const session = await prisma.tableSession.findFirst({
    where: { id, status: "OPEN", table: { venueId: user.venueId } },
    include: { table: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Açık masa yok" }, { status: 404 });
  }

  const resolved = await resolveStaffOrderLines(user.venueId, body.data.items);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 409 });
  }
  const { lines, stockLines } = resolved;

  const guest = await getOrCreateStaffProxyGuest(session.id, user.name);
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableSessionId: session.id,
          guestId: guest.id,
          guestName: guest.nickname,
          idempotencyKey: randomUUID(),
          statusEvents: { create: { toStatus: "PENDING" } },
          items: {
            create: lines.map((line) => ({
              menuItemId: line.menuItem.id,
              name: line.menuItem.name,
              price: line.price,
              quantity: line.quantity,
              note: line.note,
              options: {
                create: line.options.map((option) => ({
                  name: option.name,
                  priceDelta: option.priceDelta,
                })),
              },
            })),
          },
        },
        include: { items: true },
      });
      await consumeStockForOrder(tx, {
        venueId: session.table.venueId,
        orderId: created.id,
        items: stockLines,
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json(
        {
          error: `${error.message.slice("OUT_OF_STOCK:".length)} için yeterli stok yok`,
        },
        { status: 409 },
      );
    }
    console.error("Personel siparişi yazılamadı", error);
    return NextResponse.json(
      { error: "Sipariş gönderilemedi" },
      { status: 500 },
    );
  }

  void pushToVenueRoles(
    session.table.venueId,
    ["PLATFORM", "OWNER", "ADMIN", "KITCHEN"],
    {
      title: "Yeni sipariş",
      body: `${tableLabel(session.table.number)} · ${guest.nickname}`,
      url: "/staff/kitchen",
      tag: `order-${order.id}`,
    },
  );

  return NextResponse.json({ id: order.id, status: order.status });
}
