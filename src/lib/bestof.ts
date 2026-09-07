import {
  BESTOF_CATEGORIES,
  BESTOF_ITEMS,
  type BestOfCategoryId,
  type BestOfItem,
} from "@/lib/bestof-data";

export { BESTOF_CATEGORIES, BESTOF_ITEMS, type BestOfCategoryId, type BestOfItem };

export function isBestOfCategory(id: string): id is BestOfCategoryId {
  return BESTOF_CATEGORIES.some((row) => row.id === id);
}

export function categoryLabel(id: string) {
  return BESTOF_CATEGORIES.find((row) => row.id === id)?.label ?? "Kategori";
}

export function itemsFor(category: string) {
  if (!isBestOfCategory(category)) return [];
  return BESTOF_ITEMS.filter((row) => row.cat === category);
}

export function itemById(id: string) {
  return BESTOF_ITEMS.find((row) => row.id === id) ?? null;
}

export function categoryStats() {
  return BESTOF_CATEGORIES.map((row) => ({
    id: row.id,
    label: row.label,
    count: BESTOF_ITEMS.filter((item) => item.cat === row.id).length,
  }));
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseVotes(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    const votes: Record<string, "a" | "b"> = {};
    for (const [id, choice] of Object.entries(parsed)) {
      if (choice === "a" || choice === "b") votes[id] = choice;
    }
    return votes;
  } catch {
    return {};
  }
}

export function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j] as T;
    next[j] = tmp as T;
  }
  return next;
}

export function startBracket(category: string) {
  const ids = shuffle(itemsFor(category).map((row) => row.id));
  if (ids.length < 2) return null;
  const [a, b, ...queue] = ids;
  return {
    queue,
    winners: [] as string[],
    pair: [a, b] as [string, string],
    championId: null as string | null,
  };
}

export function winnerSide(votes: Record<string, "a" | "b">, voterIds: string[]) {
  if (!voterIds.length) return null;
  const counted = voterIds.filter((id) => votes[id] === "a" || votes[id] === "b");
  if (counted.length < voterIds.length) return null;
  let a = 0;
  let b = 0;
  for (const id of voterIds) {
    if (votes[id] === "a") a += 1;
    if (votes[id] === "b") b += 1;
  }
  if (a === b) return null;
  return a > b ? "a" : "b";
}

export function advanceBracket(
  queue: string[],
  winners: string[],
  pair: [string, string],
  side: "a" | "b",
) {
  const nextWinners = [...winners, side === "a" ? pair[0] : pair[1]];
  let nextQueue = [...queue];
  if (nextQueue.length >= 2) {
    const a = nextQueue[0] as string;
    const b = nextQueue[1] as string;
    return {
      queue: nextQueue.slice(2),
      winners: nextWinners,
      pair: [a, b] as [string, string],
      championId: null as string | null,
    };
  }
  if (nextQueue.length === 1) {
    nextWinners.push(nextQueue[0] as string);
    nextQueue = [];
  }
  if (nextWinners.length === 1) {
    return {
      queue: [] as string[],
      winners: [] as string[],
      pair: null as [string, string] | null,
      championId: nextWinners[0] as string,
    };
  }
  const shuffled = shuffle(nextWinners);
  const a = shuffled[0] as string;
  const b = shuffled[1] as string;
  return {
    queue: shuffled.slice(2),
    winners: [] as string[],
    pair: [a, b] as [string, string],
    championId: null as string | null,
  };
}

export function aliveCount(queue: string[], winners: string[], pair: string[] | null) {
  return queue.length + winners.length + (pair && pair.length === 2 ? 2 : 0);
}

export function roundLabel(alive: number) {
  if (alive <= 1) return "Şampiyon";
  if (alive === 2) return "Final";
  if (alive === 4) return "Yarı final";
  if (alive === 8) return "Çeyrek final";
  return `Son ${alive}`;
}
