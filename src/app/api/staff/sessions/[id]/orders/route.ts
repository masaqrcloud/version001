import { NextResponse } from "next/server";
import { z } from "zod";
import { placeStaffOrder } from "@/lib/staff-place-order";
import { staffOrderItemSchema } from "@/lib/staff-order-lines";
import { prisma } from "@/lib/db";
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
    .object({
      items: z.array(staffOrderItemSchema).min(1).max(40),
      guestName: z.string().trim().min(2).max(40).optional(),
    })
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

  const placed = await placeStaffOrder({
    venueId: user.venueId,
    sessionId: session.id,
    tableNumber: session.table.number,
    items: body.data.items,
    guestName: body.data.guestName,
  });
  if (!placed.ok) {
    return NextResponse.json({ error: placed.error }, { status: placed.status });
  }

  return NextResponse.json({
    id: placed.orderId,
    sessionId: session.id,
    status: placed.status,
  });
}
