import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

export const GUEST_COOKIE = "guest_session";

export function guestCookieOptions() {
  const authUrl = process.env.AUTH_URL ?? "";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: authUrl.startsWith("https://"),
  };
}

export function signedGuestCookie(token: string) {
  return sign(token);
}

function secret() {
  return process.env.AUTH_SECRET ?? "dev-guest-secret";
}

function sign(token: string) {
  const sig = createHmac("sha256", secret()).update(token).digest("hex");
  return `${token}.${sig}`;
}

export function verifySignedGuestToken(value: string | undefined) {
  if (!value) return null;
  const [token, sig] = value.split(".");
  if (!token || !sig) return null;
  const expected = createHmac("sha256", secret()).update(token).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return token;
}

export async function findTable(qrToken: string) {
  return prisma.table.findUnique({
    where: { qrToken },
    include: { venue: true },
  });
}

export async function tryReuseGuest(qrToken: string) {
  const table = await findTable(qrToken);
  if (!table) return null;

  const session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: "OPEN" },
  });
  if (!session) return null;

  const store = await cookies();
  const existingToken = verifySignedGuestToken(store.get(GUEST_COOKIE)?.value);
  if (!existingToken) return null;

  const guest = await prisma.guest.findUnique({
    where: { guestToken: existingToken },
  });
  if (!guest || guest.tableSessionId !== session.id) return null;

  return { table, venue: table.venue, session, guest };
}

async function readIncomingToken(clientToken?: string | null) {
  if (clientToken && clientToken.length >= 16) {
    return clientToken;
  }
  const store = await cookies();
  const fromCookie = verifySignedGuestToken(store.get(GUEST_COOKIE)?.value);
  if (fromCookie) return fromCookie;
  const headerStore = await headers();
  return headerStore.get("x-guest-token");
}

export async function removeInactiveStaffGuests(tableId: string) {
  const session = await prisma.tableSession.findFirst({
    where: { tableId, status: "OPEN" },
  });
  if (!session) return;

  const token = await readIncomingToken();
  if (!token) return;

  const guest = await prisma.guest.findUnique({
    where: { guestToken: token },
  });
  if (!guest || guest.tableSessionId !== session.id) return;

  const [orders, cart] = await Promise.all([
    prisma.order.count({ where: { guestId: guest.id } }),
    prisma.cartItem.count({ where: { guestId: guest.id } }),
  ]);
  if (!orders && !cart) {
    await prisma.guest.delete({ where: { id: guest.id } });
  }
}

async function resolveOpenSession(tableId: string, createIfMissing: boolean) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({
      where: { id: tableId },
      select: { id: true, mergedSessionId: true },
    });
    if (!table) {
      throw new Error("TABLE_NOT_FOUND");
    }

    if (table.mergedSessionId) {
      const host = await tx.tableSession.findUnique({
        where: { id: table.mergedSessionId },
      });
      if (host?.status === "OPEN") {
        return host;
      }
      await tx.table.update({
        where: { id: tableId },
        data: { mergedSessionId: null },
      });
    }

    const open = await tx.tableSession.findMany({
      where: { tableId, status: "OPEN" },
      orderBy: { openedAt: "asc" },
    });

    if (open.length === 0) {
      if (!createIfMissing) return null;
      return tx.tableSession.create({ data: { tableId } });
    }

    const primary = open[0];
    for (const extra of open.slice(1)) {
      await tx.guest.updateMany({
        where: { tableSessionId: extra.id },
        data: { tableSessionId: primary.id },
      });
      await tx.order.updateMany({
        where: { tableSessionId: extra.id },
        data: { tableSessionId: primary.id },
      });
      if (extra.waiterCalledAt && !primary.waiterCalledAt) {
        await tx.tableSession.update({
          where: { id: primary.id },
          data: { waiterCalledAt: extra.waiterCalledAt },
        });
      }
      await tx.tableSession.update({
        where: { id: extra.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }

    return primary;
  });
}

export async function getOpenSession(tableId: string) {
  return resolveOpenSession(tableId, false);
}

export async function getOrCreateOpenSession(tableId: string) {
  const session = await resolveOpenSession(tableId, true);
  if (!session) {
    throw new Error("TABLE_NOT_FOUND");
  }
  return session;
}

export async function joinTable(qrToken: string, clientToken?: string | null) {
  const table = await prisma.table.findUnique({
    where: { qrToken },
    include: { venue: true },
  });

  if (!table) {
    return null;
  }

  const existingToken = await readIncomingToken(clientToken);
  let guest = existingToken
    ? await prisma.guest.findUnique({
        where: { guestToken: existingToken },
        include: {
          tableSession: {
            include: { mergedTables: { select: { id: true } } },
          },
        },
      })
    : null;

  const spentOnThisTable =
    Boolean(existingToken) &&
    (!guest ||
      (guest.tableSession.status === "CLOSED" &&
        (guest.tableSession.tableId === table.id ||
          guest.tableSession.mergedTables.some((item) => item.id === table.id))));

  if (spentOnThisTable) {
    const open = await getOpenSession(table.id);
    if (!open) {
      return {
        table,
        venue: table.venue,
        session: guest?.tableSession ?? null,
        guest: guest ?? null,
        closed: true as const,
      };
    }
    guest = null;
  }

  const session = await getOrCreateOpenSession(table.id);
  const currentGuest = guest
    ? { id: guest.id, tableSessionId: guest.tableSessionId }
    : null;
  let attached = currentGuest
    ? await prisma.guest.findUnique({ where: { id: currentGuest.id } })
    : null;

  if (attached && attached.tableSessionId !== session.id) {
    const current = await prisma.tableSession.findUnique({
      where: { id: attached.tableSessionId },
      include: { table: true, mergedTables: { select: { id: true } } },
    });
    const sameGroup =
      current?.status === "OPEN" &&
      (current.id === session.id ||
        current.tableId === table.id ||
        current.mergedTables.some((item) => item.id === table.id) ||
        table.mergedSessionId === current.id);
    if (sameGroup) {
      attached = await prisma.guest.update({
        where: { id: attached.id },
        data: { tableSessionId: session.id },
      });
    } else {
      attached = null;
    }
  }

  if (!attached) {
    attached = await prisma.guest.create({
      data: {
        tableSessionId: session.id,
        guestToken: randomBytes(24).toString("hex"),
      },
    });
  }

  return {
    table,
    venue: table.venue,
    session,
    guest: attached,
    closed: false as const,
  };
}

const guestWithTable = {
  tableSession: {
    include: {
      table: { include: { venue: true } },
    },
  },
} as const;

export async function getGuestFromCookie() {
  const token = await readIncomingToken();
  if (!token) return null;

  return prisma.guest.findUnique({
    where: { guestToken: token },
    include: guestWithTable,
  });
}

export async function requireOpenGuest() {
  const guest = await getGuestFromCookie();
  if (!guest) return null;
  if (guest.tableSession.status === "OPEN") return guest;
  return null;
}

export async function getOrCreateStaffProxyGuest(
  sessionId: string,
  staffName?: string | null,
) {
  const nickname = staffName?.trim()
    ? `Personel · ${staffName.trim()}`
    : "Personel";
  const existing = await prisma.guest.findFirst({
    where: { tableSessionId: sessionId, nickname },
  });
  if (existing) return existing;
  return prisma.guest.create({
    data: {
      tableSessionId: sessionId,
      guestToken: randomBytes(16).toString("hex"),
      nickname,
    },
  });
}
