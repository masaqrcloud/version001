import { NextResponse } from "next/server";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyGuest, notifyOrderStatus } from "@/lib/notify";
import { consumeStockForOrder, restoreStockForOrder } from "@/lib/stock";
import { resolveStaffOrderLines, staffOrderItemSchema } from "@/lib/staff-order-lines";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  PENDING: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: null,
  CANCELLED: null,
};

export async function PATCH(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "KITCHEN",
    "WAITER",
  ]);
  if (error) return error;

  const { id } = await context.params;
  const body = z
    .object({
      status: z
        .enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"])
        .optional(),
      advance: z.boolean().optional(),
      reason: z.string().trim().min(3).max(200).optional(),
      items: z.array(staffOrderItemSchema).min(1).max(40).optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, tableSession: { table: { venueId: user.venueId } } },
    include: {
      items: { include: { menuItem: true } },
      tableSession: { include: { table: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş yok" }, { status: 404 });
  }

  if (body.data.items) {
    const canEdit =
      order.status === "PENDING" &&
      ["PLATFORM", "OWNER", "ADMIN", "WAITER", "KITCHEN"].includes(user.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Sadece bekleyen sipariş düzenlenir" },
        { status: 409 },
      );
    }
    if (order.tableSession.status !== "OPEN") {
      return NextResponse.json({ error: "Masa kapalı" }, { status: 409 });
    }

    const credit = order.items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      menuItem: {
        name: item.menuItem.name,
        stockTracked: item.menuItem.stockTracked,
      },
    }));
    const resolved = await resolveStaffOrderLines(
      user.venueId,
      body.data.items,
      credit,
    );
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 409 });
    }
    const { lines, stockLines } = resolved;

    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({ where: { id } });
        if (!current || current.status !== "PENDING") {
          throw new Error("ORDER_CHANGED");
        }
        if (!current.stockRestoredAt) {
          await restoreStockForOrder(tx, {
            venueId: user.venueId,
            orderId: id,
            actorId: user.id,
            items: credit,
          });
        }
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        for (const line of lines) {
          await tx.orderItem.create({
            data: {
              orderId: id,
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
            },
          });
        }
        await consumeStockForOrder(tx, {
          venueId: user.venueId,
          orderId: id,
          items: stockLines,
        });
        await tx.orderStatusEvent.create({
          data: {
            orderId: id,
            fromStatus: "PENDING",
            toStatus: "PENDING",
            actorId: user.id,
            reason: "Sipariş düzenlendi",
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_CHANGED") {
        return NextResponse.json(
          { error: "Sipariş artık bekliyor değil, düzenlenemez" },
          { status: 409 },
        );
      }
      if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")) {
        return NextResponse.json(
          {
            error: `${error.message.slice("OUT_OF_STOCK:".length)} için yeterli stok yok`,
          },
          { status: 409 },
        );
      }
      console.error("Sipariş düzenlenemedi", error);
      return NextResponse.json(
        { error: "Sipariş düzenlenemedi" },
        { status: 500 },
      );
    }

    const summary = lines
      .map((line) => `${line.quantity}× ${line.menuItem.name}`)
      .join(", ");
    try {
      await notifyGuest(
        order.guestId,
        "Sipariş güncellendi",
        summary,
      );
    } catch {
      // bildirim olmasa da sipariş kalır
    }
    void pushToVenueRoles(
      order.tableSession.table.venueId,
      ["PLATFORM", "OWNER", "ADMIN", "KITCHEN"],
      {
        title: "Sipariş güncellendi",
        body: `${tableLabel(order.tableSession.table.number)} · ${summary}`,
        url: "/staff/kitchen",
        tag: `order-${order.id}`,
      },
    );

    return NextResponse.json({ id: order.id, status: "PENDING", updated: true });
  }

  let status = body.data.status;
  if (body.data.advance) {
    const advanced = nextStatus[order.status];
    if (!advanced) {
      return NextResponse.json({ error: "İlerletilemez" }, { status: 400 });
    }
    status = advanced;
  }

  if (!status) {
    return NextResponse.json({ error: "Durum gerekli" }, { status: 400 });
  }
  const targetStatus = status;

  const manager = ["PLATFORM", "OWNER", "ADMIN"].includes(user.role);
  const allowed =
    targetStatus === "CANCELLED"
      ? Boolean(body.data.reason) &&
        (manager ||
          (user.role === "KITCHEN" &&
            ["PENDING", "PREPARING"].includes(order.status)) ||
          (user.role === "WAITER" &&
            ["PENDING", "READY"].includes(order.status)))
      : targetStatus === nextStatus[order.status] &&
        (manager ||
          (user.role === "KITCHEN" &&
            ["PENDING", "PREPARING"].includes(order.status)) ||
          (user.role === "WAITER" && order.status === "READY"));
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          targetStatus === "CANCELLED" && !body.data.reason
            ? "İptal nedeni gerekli"
            : "Bu durum geçişine yetkiniz yok",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new Error("ORDER_NOT_FOUND");
    if (current.status !== order.status) throw new Error("ORDER_CHANGED");

    if (targetStatus === "CANCELLED" && !current.stockRestoredAt) {
      await restoreStockForOrder(tx, {
        venueId: user.venueId,
        orderId: id,
        actorId: user.id,
        items: order.items,
      });
    }

    const changed = await tx.order.update({
      where: { id },
      data: {
        status: targetStatus,
        ...(targetStatus === "CANCELLED"
          ? {
              cancelledAt: new Date(),
              cancelledByUserId: user.id,
              cancelReason: body.data.reason,
              stockRestoredAt: new Date(),
            }
          : {}),
      },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        fromStatus: current.status,
        toStatus: targetStatus,
        actorId: user.id,
        reason: targetStatus === "CANCELLED" ? body.data.reason : null,
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
      { error: "Sipariş başka bir personel tarafından güncellendi" },
      { status: 409 },
    );
  }

  if (updated.status !== order.status) {
    try {
      await notifyOrderStatus(
        updated.guestId,
        updated.status,
        updated.tableSessionId,
        order.items
          .map((item) => `${item.quantity}× ${item.name}`)
          .join(", "),
      );
    } catch (error) {
      console.error("Bildirim yazılamadı", error);
    }
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
}
