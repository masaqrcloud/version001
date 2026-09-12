import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Önce bir mekan seç" }, { status: 400 });
  }

  const members = await prisma.venueMember.findMany({
    where: {
      venueId: user.venueId,
      unlinkedAt: null,
      customer: { deletedAt: null },
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const customerIds = members.map((member) => member.customerId);
  const orders = customerIds.length
    ? await prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          guest: {
            customerId: { in: customerIds },
            tableSession: { table: { venueId: user.venueId } },
          },
        },
        select: { guest: { select: { customerId: true } } },
      })
    : [];

  const counts = new Map<string, number>();
  for (const order of orders) {
    const id = order.guest.customerId;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return NextResponse.json({
    count: members.length,
    members: members.map((member) => ({
      id: member.id,
      name: member.customer.name,
      email: member.customer.email,
      joinedAt: member.joinedAt.toISOString(),
      orderCount: counts.get(member.customerId) ?? 0,
    })),
  });
}
