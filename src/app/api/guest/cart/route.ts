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
    include: {
      menuItem: true,
      options: { include: { option: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      price:
        Number(item.menuItem.price) +
        item.options.reduce(
          (sum, selected) => sum + Number(selected.option.priceDelta),
          0,
        ),
      quantity: item.quantity,
      note: item.note,
      options: item.options.map((selected) => ({
        id: selected.option.id,
        name: selected.option.name,
        priceDelta: Number(selected.option.priceDelta),
      })),
      available:
        item.menuItem.available &&
        item.options.every((selected) => selected.option.available) &&
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
      optionIds: z.array(z.string().min(1)).max(40).optional(),
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
    include: {
      optionGroups: {
        include: { options: { where: { available: true } } },
      },
    },
  });

  if (!menuItem) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const selectedIds = [...new Set(body.data.optionIds ?? [])].sort();
  const validOptions = menuItem.optionGroups.flatMap((group) => group.options);
  if (
    selectedIds.some(
      (id) => !validOptions.some((option) => option.id === id),
    )
  ) {
    return NextResponse.json(
      { error: "Seçilen ürün seçeneği artık mevcut değil" },
      { status: 409 },
    );
  }
  for (const group of menuItem.optionGroups) {
    const count = group.options.filter((option) =>
      selectedIds.includes(option.id),
    ).length;
    const minimum = group.required
      ? Math.max(1, group.minSelections)
      : group.minSelections;
    if (count < minimum || count > group.maxSelections) {
      return NextResponse.json(
        {
          error: `${group.name} için ${minimum}-${group.maxSelections} seçim yapın`,
        },
        { status: 400 },
      );
    }
  }

  const quantity = body.data.quantity ?? 1;
  const selectionKey = selectedIds.join(":");
  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      guestId_menuItemId_selectionKey: {
        guestId: guest.id,
        menuItemId: menuItem.id,
        selectionKey,
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
      guestId_menuItemId_selectionKey: {
        guestId: guest.id,
        menuItemId: menuItem.id,
        selectionKey,
      },
    },
    create: {
      guestId: guest.id,
      menuItemId: menuItem.id,
      selectionKey,
      quantity,
      note: body.data.note,
      options: {
        create: selectedIds.map((optionId) => ({ optionId })),
      },
    },
    update: {
      quantity: { increment: quantity },
      note: body.data.note ?? undefined,
    },
  });

  return NextResponse.json({ id: item.id, quantity: item.quantity });
}
