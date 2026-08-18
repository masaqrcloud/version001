import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateOpenSession, requireOpenGuest } from "@/lib/guest";
import { displayGuestName } from "@/lib/media";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const tableId = guest.tableSession.tableId;
  const session = await getOrCreateOpenSession(tableId);
  if (guest.tableSessionId !== session.id) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { tableSessionId: session.id },
    });
  }

  const [cartItems, myOrders, tableOrders, tableGuests, notifications] =
    await Promise.all([
      prisma.cartItem.findMany({
        where: { guestId: guest.id },
        include: { menuItem: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.findMany({
        where: { guestId: guest.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          tableSession: { tableId, status: "OPEN" },
          status: { not: "CANCELLED" },
        },
        include: { items: true, guest: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.guest.findMany({
        where: { tableSession: { tableId, status: "OPEN" } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.guestNotification.findMany({
        where: { guestId: guest.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const orderedIds = new Set(tableOrders.map((order) => order.guestId));
  const recent = Date.now() - 2 * 60 * 60 * 1000;
  const visibleGuests = tableGuests.filter(
    (item) =>
      item.id === guest.id ||
      Boolean(item.nickname?.trim()) ||
      orderedIds.has(item.id) ||
      item.createdAt.getTime() > recent,
  );
  const lines = tableOrders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      guestId: order.guestId,
      guestName: order.guestName || displayGuestName(order.guest.nickname),
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      note: item.note,
      status: order.status,
    })),
  );

  return NextResponse.json({
    cart: {
      items: cartItems.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        price: Number(item.menuItem.price),
        quantity: item.quantity,
        note: item.note,
        available: item.menuItem.available,
        imageUrl: item.menuItem.imageUrl,
      })),
    },
    orders: {
      orders: myOrders.map((order) => ({
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          note: item.note,
        })),
      })),
    },
    bill: {
      currentGuestId: guest.id,
      guests: visibleGuests.map((item) => ({
        id: item.id,
        nickname: displayGuestName(item.nickname),
        isMe: item.id === guest.id,
      })),
      lines,
      total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    },
    notes: {
      unread: notifications.filter((item) => !item.read).length,
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        read: item.read,
        createdAt: item.createdAt,
      })),
    },
  });
}
