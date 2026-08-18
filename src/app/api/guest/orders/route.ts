import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { notifyOrderStatus } from "@/lib/notify";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { guestId: guest.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
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
  });
}

export async function POST() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const cart = await prisma.cartItem.findMany({
    where: { guestId: guest.id },
    include: { menuItem: true },
  });

  if (cart.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  const unavailable = cart.find((item) => !item.menuItem.available);
  if (unavailable) {
    return NextResponse.json(
      { error: `${unavailable.menuItem.name} artık mevcut değil` },
      { status: 400 },
    );
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableSessionId: guest.tableSessionId,
          guestId: guest.id,
          guestName: guest.nickname?.trim() || "Misafir",
          items: {
            create: cart.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.menuItem.name,
              price: item.menuItem.price,
              quantity: item.quantity,
              note: item.note?.trim() || null,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { guestId: guest.id } });
      return created;
    });
  } catch (error) {
    console.error("Sipariş yazılamadı", error);
    return NextResponse.json(
      { error: "Sipariş gönderilemedi, tekrar dene" },
      { status: 500 },
    );
  }

  try {
    await notifyOrderStatus(
      guest.id,
      order.status,
      guest.tableSessionId,
      order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
    );
  } catch (error) {
    console.error("Bildirim yazılamadı", error);
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
  });
}
