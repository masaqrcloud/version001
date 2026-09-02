import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatTableGroup } from "@/lib/table-groups";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN", "KITCHEN", "WAITER"]);
  if (error) return error;

  const orders = await prisma.order.findMany({
    where: {
      tableSession: { status: "OPEN", table: { venueId: user.venueId } },
      status: { in: ["PENDING", "PREPARING", "READY"] },
    },
    include: {
      items: { include: { options: true } },
      guest: true,
      tableSession: {
        include: { table: true, mergedTables: { select: { number: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      tableNumber: formatTableGroup(
        order.tableSession.table.number,
        order.tableSession.mergedTables.map((table) => table.number),
      ),
      guestName: order.guestName || order.guest.nickname || "Misafir",
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        options: item.options.map((option) => option.name),
      })),
    })),
  });
}
