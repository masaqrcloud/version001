import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { venueOpenState } from "@/lib/opening-hours";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  const items = await prisma.cartItem.findMany({
    where: { guestId: guest.id },
    include: { menuItem: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      price: Number(item.menuItem.price),
      quantity: item.quantity,
      note: item.note,
      available:
        item.menuItem.available &&
        (!item.menuItem.stockTracked || item.menuItem.stockQuantity > 0),
      imageUrl: item.menuItem.imageUrl,
    })),
  });
}

export async function POST(request: Request) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  if (!venueOpenState(guest.tableSession.table.venue.openingHours).isOpen) {
    return NextResponse.json(
      { error: "Mekân şu anda kapalı; sepete ürün eklenemez." },
      { status: 409 },
    );
  }

  const body = z
    .object({
      menuItemId: z.string().min(1),
      quantity: z.number().int().min(1).max(20).optional(),
      note: z.string().max(140).optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id: body.data.menuItemId,
      available: true,
      category: { venueId: guest.tableSession.table.venueId },
    },
  });

  if (!menuItem) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const quantity = body.data.quantity ?? 1;
  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      guestId_menuItemId: {
        guestId: guest.id,
        menuItemId: menuItem.id,
      },
    },
  });
  const requestedQuantity = quantity + (existingCartItem?.quantity ?? 0);
  if (menuItem.stockTracked && menuItem.stockQuantity < requestedQuantity) {
    return NextResponse.json(
      { error: `${menuItem.name} için yeterli stok yok` },
      { status: 409 },
    );
  }

  const item = await prisma.cartItem.upsert({
    where: {
      guestId_menuItemId: {
        guestId: guest.id,
        menuItemId: menuItem.id,
      },
    },
    create: {
      guestId: guest.id,
      menuItemId: menuItem.id,
      quantity,
      note: body.data.note,
    },
    update: {
      quantity: { increment: quantity },
      note: body.data.note ?? undefined,
    },
  });

  return NextResponse.json({ id: item.id, quantity: item.quantity });
}
