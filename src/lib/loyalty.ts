import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const LOYALTY_THRESHOLD = 10;

type Db = Prisma.TransactionClient | typeof prisma;

export function punchCard(
  count: number,
  redeemed = 0,
  threshold = LOYALTY_THRESHOLD,
) {
  const safe = Math.max(0, Math.floor(count));
  const used = Math.max(0, Math.floor(redeemed));
  const earned = Math.floor(safe / threshold);
  const available = Math.max(0, earned - used);
  const remainder = safe % threshold;
  const filled = remainder === 0 && available > 0 ? threshold : remainder;
  return {
    count: safe,
    redeemed: used,
    earned,
    available,
    rewards: available,
    filled,
    complete: available > 0,
    threshold,
  };
}

export async function countLoyaltyQuantity(
  customerId: string,
  venueId: string,
  menuItemId: string,
  db: Db = prisma,
) {
  const result = await db.orderItem.aggregate({
    _sum: { quantity: true },
    where: {
      menuItemId,
      complimentary: false,
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

export async function customerVenueLoyalty(
  customerId: string,
  venueId: string,
  db: Db = prisma,
) {
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      loyaltyItemId: true,
    },
  });
  const member = await db.venueMember.findUnique({
    where: { venueId_customerId: { venueId, customerId } },
  });
  const item = venue?.loyaltyItemId
    ? await db.menuItem.findUnique({
        where: { id: venue.loyaltyItemId },
        select: {
          id: true,
          name: true,
          nameEn: true,
          imageUrl: true,
          available: true,
          stockTracked: true,
          stockQuantity: true,
        },
      })
    : null;
  const active = Boolean(member && !member.unlinkedAt);
  const count =
    item && active
      ? await countLoyaltyQuantity(customerId, venueId, item.id, db)
      : 0;
  return {
    venue,
    member: active ? member : null,
    item,
    ...punchCard(count, active ? member?.loyaltyRedeemed ?? 0 : 0),
  };
}

export async function refundLoyaltyRedemptions(
  db: Prisma.TransactionClient,
  order: {
    guestId: string;
    items: { complimentary: boolean; quantity: number }[];
    tableSession?: { table: { venueId: string } };
  },
  venueId: string,
) {
  const qty = order.items
    .filter((item) => item.complimentary)
    .reduce((sum, item) => sum + item.quantity, 0);
  if (qty <= 0) return;
  const guest = await db.guest.findUnique({
    where: { id: order.guestId },
    select: { customerId: true },
  });
  if (!guest?.customerId) return;
  const member = await db.venueMember.findUnique({
    where: {
      venueId_customerId: {
        venueId,
        customerId: guest.customerId,
      },
    },
  });
  if (!member || member.loyaltyRedeemed <= 0) return;
  await db.venueMember.update({
    where: { id: member.id },
    data: {
      loyaltyRedeemed: Math.max(0, member.loyaltyRedeemed - qty),
    },
  });
}
