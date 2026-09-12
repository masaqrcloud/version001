import type { OrderStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isStaffProxyNickname } from "@/lib/media";
import {
  renderGuestNotice,
  type GuestNoticeCode,
  type GuestNoticeVars,
} from "@/lib/i18n-guest";

const orderNotice: Record<OrderStatus, GuestNoticeCode> = {
  PENDING: "noticeOrderPENDING",
  PREPARING: "noticeOrderPREPARING",
  READY: "noticeOrderREADY",
  SERVED: "noticeOrderSERVED",
  CANCELLED: "noticeOrderCANCELLED",
};

function noticeData(
  guestId: string,
  code: GuestNoticeCode,
  vars?: GuestNoticeVars,
) {
  const { title, body } = renderGuestNotice("tr", code, vars);
  return {
    guestId,
    title,
    body,
    code,
    vars: (vars ?? {}) as Prisma.InputJsonValue,
  };
}

export async function notifyTableGuests(
  tableSessionId: string,
  code: GuestNoticeCode,
  vars?: GuestNoticeVars,
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
    data: targets.map((guest) => noticeData(guest.id, code, vars)),
  });
}

export async function notifyGuest(
  guestId: string,
  code: GuestNoticeCode,
  vars?: GuestNoticeVars,
) {
  if (!prisma.guestNotification) return;
  return prisma.guestNotification.create({
    data: noticeData(guestId, code, vars),
  });
}

export async function notifyOrderStatus(
  guestId: string,
  status: OrderStatus,
  tableSessionId?: string,
  itemSummary?: string,
) {
  if (!prisma.guestNotification) return;

  const code = orderNotice[status];
  const orderGuest = await prisma.guest.findUnique({ where: { id: guestId } });
  const sessionId = tableSessionId ?? orderGuest?.tableSessionId;
  const who = orderGuest?.nickname?.trim() || "";

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
    data: recipientIds.map((id) => {
      const vars: GuestNoticeVars = {
        ...(itemSummary ? { items: itemSummary } : {}),
        ...(who ? { who } : {}),
        ...(id !== guestId ? { other: true } : {}),
      };
      return noticeData(id, code, vars);
    }),
  });
}
