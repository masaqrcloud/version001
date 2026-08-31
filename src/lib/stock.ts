import type { Prisma, StockMovementReason } from "@prisma/client";

type StockLine = {
  menuItemId: string;
  quantity: number;
  menuItem: { name: string; stockTracked: boolean };
};

export function groupedTrackedStock(items: StockLine[]) {
  const grouped = new Map<string, { name: string; quantity: number }>();
  for (const item of items) {
    if (!item.menuItem.stockTracked || item.quantity <= 0) continue;
    const current = grouped.get(item.menuItemId);
    grouped.set(item.menuItemId, {
      name: item.menuItem.name,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  return grouped;
}

async function recordMovement(
  tx: Prisma.TransactionClient,
  data: {
    venueId: string;
    menuItemId: string;
    delta: number;
    quantityAfter: number;
    reason: StockMovementReason;
    note?: string | null;
    orderId?: string | null;
    actorId?: string | null;
  },
) {
  await tx.stockMovement.create({
    data: {
      venueId: data.venueId,
      menuItemId: data.menuItemId,
      delta: data.delta,
      quantityAfter: data.quantityAfter,
      reason: data.reason,
      note: data.note?.trim() || null,
      orderId: data.orderId ?? null,
      actorId: data.actorId ?? null,
    },
  });
}

export async function consumeStockForOrder(
  tx: Prisma.TransactionClient,
  args: {
    venueId: string;
    orderId?: string | null;
    items: StockLine[];
  },
) {
  for (const [menuItemId, need] of groupedTrackedStock(args.items)) {
    const updated = await tx.menuItem.updateMany({
      where: {
        id: menuItemId,
        stockTracked: true,
        stockQuantity: { gte: need.quantity },
      },
      data: { stockQuantity: { decrement: need.quantity } },
    });
    if (updated.count !== 1) {
      throw new Error(`OUT_OF_STOCK:${need.name}`);
    }
    const after = await tx.menuItem.findUnique({
      where: { id: menuItemId },
      select: { stockQuantity: true },
    });
    await recordMovement(tx, {
      venueId: args.venueId,
      menuItemId,
      delta: -need.quantity,
      quantityAfter: after?.stockQuantity ?? 0,
      reason: "ORDER",
      orderId: args.orderId,
    });
  }
}

export async function restoreStockForOrder(
  tx: Prisma.TransactionClient,
  args: {
    venueId: string;
    orderId?: string | null;
    actorId?: string | null;
    items: StockLine[];
  },
) {
  for (const [menuItemId, need] of groupedTrackedStock(args.items)) {
    const after = await tx.menuItem.update({
      where: { id: menuItemId },
      data: { stockQuantity: { increment: need.quantity } },
      select: { stockQuantity: true },
    });
    await recordMovement(tx, {
      venueId: args.venueId,
      menuItemId,
      delta: need.quantity,
      quantityAfter: after.stockQuantity,
      reason: "CANCEL",
      orderId: args.orderId,
      actorId: args.actorId,
    });
  }
}

export async function applyAdminStockChange(
  tx: Prisma.TransactionClient,
  args: {
    venueId: string;
    menuItemId: string;
    actorId: string;
    action:
      | { type: "track"; quantity: number; threshold?: number }
      | { type: "untrack" }
      | { type: "set"; quantity: number; note?: string | null }
      | {
          type: "adjust";
          delta: number;
          reason: Extract<StockMovementReason, "RECEIVE" | "WASTE" | "ADJUST">;
          note?: string | null;
        }
      | { type: "threshold"; lowStockThreshold: number };
  },
) {
  const item = await tx.menuItem.findFirst({
    where: { id: args.menuItemId, category: { venueId: args.venueId } },
  });
  if (!item) throw new Error("ITEM_NOT_FOUND");

  if (args.action.type === "untrack") {
    return tx.menuItem.update({
      where: { id: item.id },
      data: { stockTracked: false },
    });
  }

  if (args.action.type === "threshold") {
    return tx.menuItem.update({
      where: { id: item.id },
      data: { lowStockThreshold: args.action.lowStockThreshold },
    });
  }

  if (args.action.type === "track") {
    const next = await tx.menuItem.update({
      where: { id: item.id },
      data: {
        stockTracked: true,
        stockQuantity: args.action.quantity,
        ...(args.action.threshold !== undefined
          ? { lowStockThreshold: args.action.threshold }
          : {}),
      },
    });
    await recordMovement(tx, {
      venueId: args.venueId,
      menuItemId: item.id,
      delta: args.action.quantity - item.stockQuantity,
      quantityAfter: next.stockQuantity,
      reason: "COUNT",
      note: "Stok takibi açıldı",
      actorId: args.actorId,
    });
    return next;
  }

  if (!item.stockTracked) {
    throw new Error("NOT_TRACKED");
  }

  if (args.action.type === "set") {
    const next = await tx.menuItem.update({
      where: { id: item.id },
      data: { stockQuantity: args.action.quantity },
    });
    await recordMovement(tx, {
      venueId: args.venueId,
      menuItemId: item.id,
      delta: args.action.quantity - item.stockQuantity,
      quantityAfter: next.stockQuantity,
      reason: "COUNT",
      note: args.action.note,
      actorId: args.actorId,
    });
    return next;
  }

  const nextQuantity = item.stockQuantity + args.action.delta;
  if (nextQuantity < 0) {
    throw new Error("NEGATIVE_STOCK");
  }
  const next = await tx.menuItem.update({
    where: { id: item.id },
    data: { stockQuantity: nextQuantity },
  });
  await recordMovement(tx, {
    venueId: args.venueId,
    menuItemId: item.id,
    delta: args.action.delta,
    quantityAfter: next.stockQuantity,
    reason: args.action.reason,
    note: args.action.note,
    actorId: args.actorId,
  });
  return next;
}

export function stockStatus(
  item: { stockTracked: boolean; stockQuantity: number; lowStockThreshold: number },
) {
  if (!item.stockTracked) return "off" as const;
  if (item.stockQuantity <= 0) return "out" as const;
  if (item.stockQuantity <= item.lowStockThreshold) return "low" as const;
  return "ok" as const;
}
