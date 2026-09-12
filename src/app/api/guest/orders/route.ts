import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyOrderStatus } from "@/lib/notify";
import { venueOpenState } from "@/lib/opening-hours";
import { consumeStockForOrder, groupedTrackedStock } from "@/lib/stock";
import { z } from "zod";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";
import { customerVenueLoyalty } from "@/lib/loyalty";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  const orders = await prisma.order.findMany({
    where: { guestId: guest.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        note: item.note,
        complimentary: item.complimentary,
      })),
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
      { error: "Mekân şu anda kapalı; sipariş gönderilemez." },
      { status: 409 },
    );
  }

  const body = z
    .object({
      idempotencyKey: z.string().uuid(),
      useLoyalty: z.boolean().optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Geçersiz sipariş anahtarı" },
      { status: 400 },
    );
  }
  const previous = await prisma.order.findUnique({
    where: { idempotencyKey: body.data.idempotencyKey },
  });
  if (previous) {
    if (previous.guestId !== guest.id) {
      return NextResponse.json({ error: "Geçersiz sipariş" }, { status: 409 });
    }
    return NextResponse.json({ id: previous.id, status: previous.status });
  }

  const cart = await prisma.cartItem.findMany({
    where: { guestId: guest.id },
    include: {
      menuItem: {
        include: {
          optionGroups: { include: { options: true } },
        },
      },
      options: { include: { option: true } },
    },
  });

  const venueId = guest.tableSession.table.venueId;
  let gift: {
    menuItemId: string;
    name: string;
    available: boolean;
    stockTracked: boolean;
    stockQuantity: number;
    memberId: string;
  } | null = null;
  if (body.data.useLoyalty) {
    if (!guest.customerId) {
      return NextResponse.json(
        { error: "İkram için Google ile bağlan" },
        { status: 400 },
      );
    }
    const loyalty = await customerVenueLoyalty(guest.customerId, venueId);
    if (!loyalty.item || !loyalty.member || loyalty.available < 1) {
      return NextResponse.json(
        { error: "Kullanılacak müdavim ikramın yok" },
        { status: 400 },
      );
    }
    if (!loyalty.item.available) {
      return NextResponse.json(
        { error: `${loyalty.item.name} artık mevcut değil` },
        { status: 400 },
      );
    }
    gift = {
      menuItemId: loyalty.item.id,
      name: loyalty.item.name,
      available: loyalty.item.available,
      stockTracked: loyalty.item.stockTracked,
      stockQuantity: loyalty.item.stockQuantity,
      memberId: loyalty.member.id,
    };
  }

  if (cart.length === 0 && !gift) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  const unavailable = cart.find((item) => !item.menuItem.available);
  if (unavailable) {
    return NextResponse.json(
      { error: `${unavailable.menuItem.name} artık mevcut değil` },
      { status: 400 },
    );
  }
  const stockLines = [
    ...cart,
    ...(gift
      ? [
          {
            menuItemId: gift.menuItemId,
            quantity: 1,
            menuItem: {
              name: gift.name,
              stockTracked: gift.stockTracked,
            },
          },
        ]
      : []),
  ];
  const needed = groupedTrackedStock(stockLines);
  for (const [menuItemId, need] of needed) {
    const cartItem = cart.find((entry) => entry.menuItemId === menuItemId);
    const onHand = cartItem?.menuItem.stockQuantity ?? gift?.stockQuantity ?? 0;
    if (onHand < need.quantity) {
      return NextResponse.json(
        { error: `${need.name} için yeterli stok yok` },
        { status: 409 },
      );
    }
  }
  for (const item of cart) {
    const selectedIds = item.options.map((selected) => selected.optionId);
    if (item.options.some((selected) => !selected.option.available)) {
      return NextResponse.json(
        { error: `${item.menuItem.name} seçeneklerinden biri artık mevcut değil` },
        { status: 409 },
      );
    }
    for (const group of item.menuItem.optionGroups) {
      const count = group.options.filter((option) =>
        selectedIds.includes(option.id),
      ).length;
      const minimum = group.required
        ? Math.max(1, group.minSelections)
        : group.minSelections;
      if (count < minimum || count > group.maxSelections) {
        return NextResponse.json(
          { error: `${item.menuItem.name} seçeneklerini yeniden seçin` },
          { status: 409 },
        );
      }
    }
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableSessionId: guest.tableSessionId,
          guestId: guest.id,
          guestName: guest.nickname?.trim() || "Misafir",
          idempotencyKey: body.data.idempotencyKey,
          statusEvents: { create: { toStatus: "PENDING" } },
          items: {
            create: [
              ...cart.map((item) => ({
                menuItemId: item.menuItemId,
                name: item.menuItem.name,
                price:
                  Number(item.menuItem.price) +
                  item.options.reduce(
                    (sum, selected) =>
                      sum + Number(selected.option.priceDelta),
                    0,
                  ),
                quantity: item.quantity,
                note: item.note?.trim() || null,
                complimentary: false,
                options: {
                  create: item.options.map((selected) => ({
                    name: selected.option.name,
                    priceDelta: selected.option.priceDelta,
                  })),
                },
              })),
              ...(gift
                ? [
                    {
                      menuItemId: gift.menuItemId,
                      name: gift.name,
                      price: 0,
                      quantity: 1,
                      note: "Müdavim ikramı",
                      complimentary: true,
                    },
                  ]
                : []),
            ],
          },
        },
        include: { items: { include: { options: true } } },
      });

      if (gift) {
        const fresh = await customerVenueLoyalty(
          guest.customerId!,
          venueId,
          tx,
        );
        if (!fresh.member || fresh.available < 1) {
          throw new Error("NO_LOYALTY");
        }
        await tx.venueMember.update({
          where: { id: fresh.member.id },
          data: { loyaltyRedeemed: { increment: 1 } },
        });
      }

      await consumeStockForOrder(tx, {
        venueId: guest.tableSession.table.venueId,
        orderId: created.id,
        items: stockLines,
      });

      await tx.cartItem.deleteMany({ where: { guestId: guest.id } });
      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_LOYALTY") {
      return NextResponse.json(
        { error: "Kullanılacak müdavim ikramın yok" },
        { status: 400 },
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
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: body.data.idempotencyKey },
      });
      if (existing?.guestId === guest.id) {
        return NextResponse.json({
          id: existing.id,
          status: existing.status,
        });
      }
    }
    console.error("Sipariş yazılamadı", error);
    return NextResponse.json(
      { error: "Sipariş gönderilemedi, tekrar dene" },
      { status: 500 },
    );
  }

  try {
    await notifyOrderStatus(
      guest.id,
      order.status,
      guest.tableSessionId,
      order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
    );
  } catch (error) {
    console.error("Bildirim yazılamadı", error);
  }
  void pushToVenueRoles(
    guest.tableSession.table.venueId,
    ["PLATFORM", "OWNER", "ADMIN", "KITCHEN"],
    {
      title: "Yeni sipariş",
      body: `${tableLabel(guest.tableSession.table.number)} · ${guest.nickname?.trim() || "Misafir"}`,
      url: "/staff/kitchen",
      tag: `order-${order.id}`,
    },
  );

  return NextResponse.json({
    id: order.id,
    status: order.status,
  });
}
