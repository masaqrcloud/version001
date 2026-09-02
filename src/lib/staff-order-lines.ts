import { z } from "zod";
import { prisma } from "@/lib/db";
import { groupedTrackedStock } from "@/lib/stock";

export const staffOrderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(30),
  note: z.string().trim().max(200).optional(),
  optionIds: z.array(z.string()).max(20).optional(),
});

export async function resolveStaffOrderLines(
  venueId: string,
  items: z.infer<typeof staffOrderItemSchema>[],
  credit: Parameters<typeof groupedTrackedStock>[0] = [],
) {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: items.map((item) => item.menuItemId) },
      category: { venueId },
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

  for (const entry of items) {
    const menuItem = byId.get(entry.menuItemId);
    if (!menuItem || !menuItem.available) {
      return { error: "Bir ürün artık mevcut değil" as const };
    }
    const optionIds = entry.optionIds ?? [];
    const selected = menuItem.optionGroups
      .flatMap((group) => group.options)
      .filter((option) => optionIds.includes(option.id));
    if (selected.some((option) => !option.available)) {
      return { error: `${menuItem.name} seçeneklerinden biri yok` as const };
    }
    for (const group of menuItem.optionGroups) {
      const count = group.options.filter((option) =>
        optionIds.includes(option.id),
      ).length;
      const minimum = group.required
        ? Math.max(1, group.minSelections)
        : group.minSelections;
      if (count < minimum || count > group.maxSelections) {
        return { error: `${menuItem.name} seçeneklerini kontrol et` as const };
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
  const credited = groupedTrackedStock(credit);
  for (const [menuItemId, need] of groupedTrackedStock(stockLines)) {
    const item = byId.get(menuItemId);
    const available =
      (item?.stockQuantity ?? 0) + (credited.get(menuItemId)?.quantity ?? 0);
    if (item && available < need.quantity) {
      return { error: `${need.name} için yeterli stok yok` as const };
    }
  }

  return { lines, stockLines };
}
