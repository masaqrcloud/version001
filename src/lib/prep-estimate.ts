import { prisma } from "@/lib/db";

const HISTORY_DAYS = 30;
const MIN_SAMPLES = 5;
const DEFAULT_MINUTES = 12;
const MIN_SAMPLE_MS = 30_000;
const MAX_SAMPLE_MS = 120 * 60_000;
const STATS_TTL_MS = 5 * 60_000;
export const DEFAULT_KITCHEN_CAPACITY = 3;

type PrepStats = {
  items: Map<string, number>;
  venue: number | null;
};

export type PrepEstimate = {
  readyAt: Date;
  remainingMinutes: number;
  totalMinutes: number;
  late: boolean;
  queueAhead: number;
};

export type PrepEstimateJson = {
  readyAt: string;
  remainingMinutes: number;
  late: boolean;
  queueAhead: number;
};

const statsCache = new Map<string, { at: number; stats: PrepStats }>();

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Son 30 günün hazır olan siparişlerinden ürün başına medyan pişirme süresi.
 * Süre, "hazırlamaya başla"dan "hazır"a kadar ölçülür; iki buton art arda
 * basıldıysa siparişin verildiği andan itibaren sayılır.
 */
async function prepStats(venueId: string): Promise<PrepStats> {
  const cached = statsCache.get(venueId);
  if (cached && Date.now() - cached.at < STATS_TTL_MS) return cached.stats;

  const orders = await prisma.order.findMany({
    where: {
      tableSession: { table: { venueId } },
      createdAt: { gte: new Date(Date.now() - HISTORY_DAYS * 86_400_000) },
      status: { in: ["READY", "SERVED"] },
    },
    select: {
      createdAt: true,
      items: { select: { menuItemId: true } },
      statusEvents: {
        where: { toStatus: { in: ["PREPARING", "READY"] } },
        select: { toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const perItem = new Map<string, number[]>();
  const all: number[] = [];
  for (const order of orders) {
    const ready = order.statusEvents.find((event) => event.toStatus === "READY");
    if (!ready) continue;
    const preparing = order.statusEvents.find(
      (event) => event.toStatus === "PREPARING",
    );
    let ms =
      ready.createdAt.getTime() -
      (preparing ?? order).createdAt.getTime();
    if (preparing && ms < 60_000) {
      ms = ready.createdAt.getTime() - order.createdAt.getTime();
    }
    if (ms < MIN_SAMPLE_MS || ms > MAX_SAMPLE_MS) continue;

    const minutes = ms / 60_000;
    all.push(minutes);
    for (const menuItemId of new Set(order.items.map((item) => item.menuItemId))) {
      const list = perItem.get(menuItemId) ?? [];
      list.push(minutes);
      perItem.set(menuItemId, list);
    }
  }

  const stats: PrepStats = {
    items: new Map(
      [...perItem.entries()]
        .filter(([, values]) => values.length >= MIN_SAMPLES)
        .map(([id, values]) => [id, median(values)]),
    ),
    venue: all.length >= MIN_SAMPLES ? median(all) : null,
  };
  statsCache.set(venueId, { at: Date.now(), stats });
  return stats;
}

type EstimatableOrder = {
  etaExtraMinutes: number;
  items: { menuItemId: string; menuItem: { prepMinutes: number | null } }[];
};

/** Ürünler paralel pişer: siparişin süresi en uzun ürünün süresidir. */
function orderMinutes(order: EstimatableOrder, stats: PrepStats) {
  const fallback = stats.venue ?? DEFAULT_MINUTES;
  const longest = order.items.reduce(
    (max, item) =>
      Math.max(
        max,
        stats.items.get(item.menuItemId) ?? item.menuItem.prepMinutes ?? fallback,
      ),
    0,
  );
  return (longest || fallback) + order.etaExtraMinutes;
}

function buildEstimate(
  createdAt: Date,
  readyAtMs: number,
  nowMs: number,
  queueAhead: number,
): PrepEstimate {
  const late = readyAtMs <= nowMs;
  return {
    readyAt: new Date(readyAtMs),
    remainingMinutes: late ? 0 : Math.max(1, Math.ceil((readyAtMs - nowMs) / 60_000)),
    totalMinutes: Math.max(1, Math.round((readyAtMs - createdAt.getTime()) / 60_000)),
    late,
    queueAhead,
  };
}

function earliestSlot(slots: number[]) {
  let index = 0;
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i] < slots[index]) index = i;
  }
  return index;
}

/**
 * Mekândaki açık siparişlerin hazır olma tahmini. Mutfak, kapasite kadar
 * paralel ocak gibi düşünülür: hazırlanan siparişler ocak tutar, bekleyenler
 * sırayla ilk boşalan ocağa yerleşir.
 */
export async function estimateVenueOrders(
  venueId: string,
  now = new Date(),
): Promise<Map<string, PrepEstimate>> {
  const [venue, stats, orders] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: venueId },
      select: { kitchenCapacity: true },
    }),
    prepStats(venueId),
    prisma.order.findMany({
      where: {
        tableSession: { status: "OPEN", table: { venueId } },
        status: { in: ["PENDING", "PREPARING"] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        etaExtraMinutes: true,
        items: {
          select: {
            menuItemId: true,
            menuItem: { select: { prepMinutes: true } },
          },
        },
        statusEvents: {
          where: { toStatus: "PREPARING" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const capacity = Math.min(
    20,
    Math.max(1, venue?.kitchenCapacity ?? DEFAULT_KITCHEN_CAPACITY),
  );
  const nowMs = now.getTime();
  const slots = Array.from({ length: capacity }, () => nowMs);
  const result = new Map<string, PrepEstimate>();

  const preparing = orders
    .filter((order) => order.status === "PREPARING")
    .map((order) => ({
      order,
      start: (order.statusEvents[0] ?? order).createdAt.getTime(),
    }))
    .sort((a, b) => a.start - b.start);
  for (const { order, start } of preparing) {
    const end = start + orderMinutes(order, stats) * 60_000;
    const slot = earliestSlot(slots);
    slots[slot] = Math.max(slots[slot], end, nowMs);
    result.set(order.id, buildEstimate(order.createdAt, end, nowMs, 0));
  }

  let ahead = 0;
  for (const order of orders.filter((item) => item.status === "PENDING")) {
    const slot = earliestSlot(slots);
    const end = Math.max(slots[slot], nowMs) + orderMinutes(order, stats) * 60_000;
    slots[slot] = end;
    result.set(order.id, buildEstimate(order.createdAt, end, nowMs, ahead));
    ahead += 1;
  }

  return result;
}

export function estimateJson(
  estimate: PrepEstimate | undefined,
): PrepEstimateJson | null {
  if (!estimate) return null;
  return {
    readyAt: estimate.readyAt.toISOString(),
    remainingMinutes: estimate.remainingMinutes,
    late: estimate.late,
    queueAhead: estimate.queueAhead,
  };
}

/** Sipariş anındaki sözü saklar; gün sonu raporu gerçek süreyle karşılaştırır. */
export async function recordInitialEstimate(venueId: string, orderId: string) {
  const estimates = await estimateVenueOrders(venueId);
  const estimate = estimates.get(orderId);
  if (!estimate) return;
  await prisma.order.updateMany({
    where: { id: orderId, estimatedMinutes: null },
    data: { estimatedMinutes: estimate.totalMinutes },
  });
}
