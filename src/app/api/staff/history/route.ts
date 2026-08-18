import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ sessions: [] });
  }

  const sessions = await prisma.tableSession.findMany({
    where: {
      status: "CLOSED",
      table: { venueId: user.venueId },
    },
    include: {
      table: true,
      bill: true,
      guests: true,
      orders: {
        include: { items: true, guest: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { closedAt: "desc" },
    take: 80,
  });

  return NextResponse.json({
    sessions: sessions.map((session) => {
      const active = session.orders.filter((order) => order.status !== "CANCELLED");
      const total =
        session.bill && Number(session.bill.total) > 0
          ? Number(session.bill.total)
          : active.reduce(
              (sum, order) =>
                sum +
                order.items.reduce(
                  (s, item) => s + Number(item.price) * item.quantity,
                  0,
                ),
              0,
            );
      const names = [
        ...new Set(
          active
            .map((order) => order.guestName || order.guest.nickname?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      ];

      return {
        id: session.id,
        tableNumber: session.table.number,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        paid: session.bill?.status === "PAID",
        total,
        guests: names,
        orders: active.map((order) => ({
          id: order.id,
          guestName: order.guestName || order.guest.nickname || "Misafir",
          createdAt: order.createdAt,
          status: order.status,
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price),
            note: item.note,
          })),
        })),
      };
    }),
  });
}
