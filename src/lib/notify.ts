import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isStaffProxyNickname } from "@/lib/media";

const statusCopy: Record<OrderStatus, { title: string; body: string }> = {
  PENDING: {
    title: "Sipariş alındı",
    body: "Sipariş mutfağa iletildi.",
  },
  PREPARING: {
    title: "Mutfak hazırlıyor",
    body: "Mutfak hazırlamaya başladı.",
  },
  READY: {
    title: "Sipariş hazır",
    body: "Mutfak hazır dedi. Garson masaya getirecek.",
  },
  SERVED: {
    title: "Servis edildi",
    body: "Sipariş masaya geldi. Afiyet olsun.",
  },
  CANCELLED: {
    title: "Sipariş iptal",
    body: "Sipariş iptal edildi.",
  },
};

function withItems(body: string, itemSummary?: string) {
  return itemSummary ? `${body} (${itemSummary})` : body;
}

export async function notifyTableGuests(
  tableSessionId: string,
  title: string,
  body: string,
  exceptGuestId?: string,
) {
  if (!prisma.guestNotification) return;
  const guests = await prisma.guest.findMany({
    where: {
      tableSessionId,
      ...(exceptGuestId ? { id: { not: exceptGuestId } } : {}),
    },
    select: { id: true, nickname: true },
  });
  const targets = guests.filter((guest) => {
    const name = guest.nickname?.trim();
    return Boolean(name) && !isStaffProxyNickname(name);
  });
  if (!targets.length) return;
  await prisma.guestNotification.createMany({
    data: targets.map((guest) => ({ guestId: guest.id, title, body })),
  });
}

export async function notifyGuest(guestId: string, title: string, body: string) {
  if (!prisma.guestNotification) return;
  return prisma.guestNotification.create({
    data: { guestId, title, body },
  });
}

export async function notifyOrderStatus(
  guestId: string,
  status: OrderStatus,
  tableSessionId?: string,
  itemSummary?: string,
) {
  if (!prisma.guestNotification) return;

  const copy = statusCopy[status];
  const body = withItems(copy.body, itemSummary);
  const orderGuest = await prisma.guest.findUnique({ where: { id: guestId } });
  const sessionId = tableSessionId ?? orderGuest?.tableSessionId;
  const who = orderGuest?.nickname?.trim() || "Masadaki sipariş";

  const guests = sessionId
    ? await prisma.guest.findMany({
        where: {
          tableSessionId: sessionId,
          NOT: { nickname: null },
        },
      })
    : [];

  const targets = guests.filter((guest) => guest.nickname?.trim());
  const recipientIds = targets.length
    ? targets.map((guest) => guest.id)
    : [guestId];

  await prisma.guestNotification.createMany({
    data: recipientIds.map((id) => ({
      guestId: id,
      title: copy.title,
      body: id === guestId ? body : `${who}: ${body}`,
    })),
  });
}
