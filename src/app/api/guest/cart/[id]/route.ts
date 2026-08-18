import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { venueOpenState } from "@/lib/opening-hours";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  if (!venueOpenState(guest.tableSession.table.venue.openingHours).isOpen) {
    return NextResponse.json(
      { error: "Mekân şu anda kapalı; sepet güncellenemez." },
      { status: 409 },
    );
  }

  const { id } = await context.params;
  const body = z
    .object({
      quantity: z.number().int().min(1).max(20).optional(),
      note: z.string().max(140).nullable().optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const existing = await prisma.cartItem.findFirst({
    where: { id, guestId: guest.id },
    include: { menuItem: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kalem yok" }, { status: 404 });
  }
  if (
    body.data.quantity !== undefined &&
    existing.menuItem.stockTracked &&
    existing.menuItem.stockQuantity < body.data.quantity
  ) {
    return NextResponse.json(
      { error: `${existing.menuItem.name} için yeterli stok yok` },
      { status: 409 },
    );
  }

  const item = await prisma.cartItem.update({
    where: { id },
    data: {
      quantity: body.data.quantity,
      note: body.data.note === undefined ? undefined : body.data.note,
    },
  });

  return NextResponse.json({ id: item.id, quantity: item.quantity });
}

export async function DELETE(_request: Request, context: Ctx) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.cartItem.deleteMany({ where: { id, guestId: guest.id } });
  return NextResponse.json({ ok: true });
}
