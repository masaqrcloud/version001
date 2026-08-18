import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  if (!prisma.guestNotification) {
    return NextResponse.json({ unread: 0, notifications: [] });
  }

  const notifications = await prisma.guestNotification.findMany({
    where: { guestId: guest.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    unread: notifications.filter((item) => !item.read).length,
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      read: item.read,
      createdAt: item.createdAt,
    })),
  });
}

export async function PATCH() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  await prisma.guestNotification.updateMany({
    where: { guestId: guest.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
