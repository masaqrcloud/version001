import { NextResponse } from "next/server";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyOrderStatus } from "@/lib/notify";
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
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, tableSession: { table: { venueId: user.venueId } } },
    include: { items: { include: { menuItem: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş yok" }, { status: 404 });
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
      for (const item of order.items) {
        if (!item.menuItem.stockTracked) continue;
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
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
