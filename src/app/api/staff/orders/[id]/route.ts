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
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, tableSession: { table: { venueId: user.venueId } } },
    include: { items: true },
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

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
  });

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
