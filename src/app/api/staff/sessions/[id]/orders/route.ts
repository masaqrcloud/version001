import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateStaffProxyGuest } from "@/lib/guest";
import { consumeStockForOrder, groupedTrackedStock } from "@/lib/stock";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

const itemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(30),
  note: z.string().trim().max(200).optional(),
  optionIds: z.array(z.string()).max(20).optional(),
});

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
    .object({ items: z.array(itemSchema).min(1).max(40) })
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

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: body.data.items.map((item) => item.menuItemId) },
      category: { venueId: user.venueId },
    },
    include: {
      optionGroups: { include: { options: true } },
    },
  });
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  type MenuItemWithOptions = (typeof menuItems)[number];
  type MenuOption = MenuItemWithOptions["optionGroups"][number]["options"][number];

  const lines: {
    menuItem: MenuItemWithOptions;
    quantity: number;
    note: string | null;
    options: MenuOption[];
    price: number;
  }[] = [];
  for (const entry of body.data.items) {
    const menuItem = byId.get(entry.menuItemId);
    if (!menuItem || !menuItem.available) {
      return NextResponse.json(
        { error: "Bir ürün artık mevcut değil" },
        { status: 409 },
      );
    }
    const optionIds = entry.optionIds ?? [];
    const selected = menuItem.optionGroups
      .flatMap((group) => group.options)
      .filter((option) => optionIds.includes(option.id));
    if (selected.some((option) => !option.available)) {
      return NextResponse.json(
        { error: `${menuItem.name} seçeneklerinden biri yok` },
        { status: 409 },
      );
    }
    for (const group of menuItem.optionGroups) {
      const count = group.options.filter((option) =>
        optionIds.includes(option.id),
      ).length;
      const minimum = group.required
        ? Math.max(1, group.minSelections)
        : group.minSelections;
      if (count < minimum || count > group.maxSelections) {
        return NextResponse.json(
          { error: `${menuItem.name} seçeneklerini kontrol et` },
          { status: 409 },
        );
      }
    }
    lines.push({
      menuItem,
      quantity: entry.quantity,
      note: entry.note?.trim() || null,
      options: selected,
      price:
        Number(menuItem.price) +
        selected.reduce((sum, option) => sum + Number(option.priceDelta), 0),
    });
  }

  const stockLines = lines.map((line) => ({
    menuItemId: line.menuItem.id,
    quantity: line.quantity,
    menuItem: {
      name: line.menuItem.name,
      stockTracked: line.menuItem.stockTracked,
    },
  }));
  for (const [menuItemId, need] of groupedTrackedStock(stockLines)) {
    const item = byId.get(menuItemId);
    if (item && item.stockQuantity < need.quantity) {
      return NextResponse.json(
        { error: `${need.name} için yeterli stok yok` },
        { status: 409 },
      );
    }
  }

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
