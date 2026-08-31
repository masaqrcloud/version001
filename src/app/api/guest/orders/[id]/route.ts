import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyOrderStatus } from "@/lib/notify";
import { restoreStockForOrder } from "@/lib/stock";
import { pushToVenueRoles } from "@/lib/staff-push";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = z
    .object({ action: z.literal("cancel") })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      guestId: guest.id,
      tableSessionId: guest.tableSessionId,
    },
    include: { items: { include: { menuItem: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json(
      {
        error:
          order.status === "CANCELLED"
            ? "Bu sipariş zaten iptal"
            : "Mutfak hazırlamaya başladı. İptal için garsonu çağır.",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current || current.status !== "PENDING") {
      throw new Error("ORDER_CHANGED");
    }

    if (!current.stockRestoredAt) {
      await restoreStockForOrder(tx, {
        venueId: guest.tableSession.table.venueId,
        orderId: id,
        items: order.items,
      });
    }

    const changed = await tx.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Misafir iptal etti",
        stockRestoredAt: new Date(),
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        fromStatus: current.status,
        toStatus: "CANCELLED",
        reason: "Misafir iptal etti",
      },
    });
    return changed;
  }).catch((transactionError) => {
    if (
      transactionError instanceof Error &&
      transactionError.message === "ORDER_CHANGED"
    ) {
      return null;
    }
    throw transactionError;
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Sipariş mutfakta güncellendi. İptal için garsonu çağır." },
      { status: 409 },
    );
  }

  try {
    await notifyOrderStatus(
      guest.id,
      "CANCELLED",
      guest.tableSessionId,
      order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
    );
  } catch (error) {
    console.error("Bildirim yazılamadı", error);
  }

  void pushToVenueRoles(
    guest.tableSession.table.venueId,
    ["PLATFORM", "OWNER", "ADMIN", "KITCHEN", "WAITER"],
    {
      title: "Sipariş iptal",
      body: `Masa ${guest.tableSession.table.number} · misafir iptal etti`,
      url: "/staff/kitchen",
      tag: `order-${order.id}`,
    },
  );

  return NextResponse.json({ id: updated.id, status: updated.status });
}
