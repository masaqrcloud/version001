import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { istanbulDayBounds } from "@/lib/day";
import { stockStatus } from "@/lib/stock";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 400 });
  }

  const { start, end } = istanbulDayBounds();
  const venueId = user.venueId;

  const [items, soldRows, cartRows, movements] = await Promise.all([
    prisma.menuItem.findMany({
      where: { category: { venueId } },
      include: {
        category: { select: { id: true, name: true, sortOrder: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { not: "CANCELLED" },
          tableSession: { table: { venueId } },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.cartItem.groupBy({
      by: ["menuItemId"],
      where: {
        guest: {
          tableSession: { status: "OPEN", table: { venueId } },
        },
      },
      _sum: { quantity: true },
    }),
    prisma.stockMovement.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        menuItem: { select: { name: true } },
        actor: { select: { name: true } },
      },
    }),
  ]);

  const soldToday = new Map(
    soldRows.map((row) => [row.menuItemId, row._sum.quantity ?? 0]),
  );
  const inCarts = new Map(
    cartRows.map((row) => [row.menuItemId, row._sum.quantity ?? 0]),
  );

  const mapped = items.map((item) => {
    const status = stockStatus(item);
    return {
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      available: item.available,
      categoryId: item.category.id,
      categoryName: item.category.name,
      stockTracked: item.stockTracked,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
      soldToday: soldToday.get(item.id) ?? 0,
      inCarts: inCarts.get(item.id) ?? 0,
      status,
    };
  });

  const tracked = mapped.filter((item) => item.stockTracked);
  return NextResponse.json({
    summary: {
      tracked: tracked.length,
      untracked: mapped.length - tracked.length,
      out: tracked.filter((item) => item.status === "out").length,
      low: tracked.filter((item) => item.status === "low").length,
      ok: tracked.filter((item) => item.status === "ok").length,
    },
    items: mapped,
    movements: movements.map((movement) => ({
      id: movement.id,
      menuItemId: movement.menuItemId,
      menuItemName: movement.menuItem.name,
      delta: movement.delta,
      quantityAfter: movement.quantityAfter,
      reason: movement.reason,
      note: movement.note,
      actorName: movement.actor?.name ?? null,
      createdAt: movement.createdAt,
    })),
  });
}
