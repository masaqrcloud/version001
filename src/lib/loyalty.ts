import { prisma } from "@/lib/db";

export const LOYALTY_THRESHOLD = 10;

export function punchCard(count: number, threshold = LOYALTY_THRESHOLD) {
  const safe = Math.max(0, Math.floor(count));
  const rewards = Math.floor(safe / threshold);
  const remainder = safe % threshold;
  const filled = remainder === 0 && safe > 0 ? threshold : remainder;
  return {
    count: safe,
    filled,
    rewards,
    complete: remainder === 0 && safe > 0,
    threshold,
  };
}

export async function countLoyaltyQuantity(
  customerId: string,
  venueId: string,
  menuItemId: string,
) {
  const result = await prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      menuItemId,
      order: {
        status: { not: "CANCELLED" },
        guest: {
          customerId,
          tableSession: { table: { venueId } },
        },
      },
    },
  });
  return result._sum.quantity ?? 0;
}
