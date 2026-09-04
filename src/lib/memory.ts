export const MEMORY_ICONS = [
  { id: "pizza", emoji: "🍕" },
  { id: "burger", emoji: "🍔" },
  { id: "fries", emoji: "🍟" },
  { id: "taco", emoji: "🌮" },
  { id: "sushi", emoji: "🍣" },
  { id: "ramen", emoji: "🍜" },
  { id: "coffee", emoji: "☕" },
  { id: "boba", emoji: "🧋" },
  { id: "donut", emoji: "🍩" },
  { id: "icecream", emoji: "🍦" },
  { id: "cake", emoji: "🍰" },
  { id: "cookie", emoji: "🍪" },
  { id: "pretzel", emoji: "🥨" },
  { id: "avocado", emoji: "🥑" },
  { id: "garlic", emoji: "🧄" },
  { id: "onion", emoji: "🧅" },
  { id: "duck", emoji: "🦆" },
  { id: "frog", emoji: "🐸" },
  { id: "unicorn", emoji: "🦄" },
  { id: "clown", emoji: "🤡" },
  { id: "ghost", emoji: "👻" },
  { id: "robot", emoji: "🤖" },
  { id: "sloth", emoji: "🦥" },
  { id: "lobster", emoji: "🦞" },
  { id: "waffle", emoji: "🧇" },
] as const;

export const MEMORY_SIZE = 25;
export const MEMORY_HIDE_MS = 850;
export const JOKER_PAIR = "joker";

export type MemoryTile = {
  icon: string;
  pair: string;
};

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function dealMemoryBoard(): MemoryTile[] {
  const pool = shuffle([...MEMORY_ICONS]);
  const joker = pool[0]!;
  const pairs = pool.slice(1, 13);
  const tiles: MemoryTile[] = [
    { icon: joker.emoji, pair: JOKER_PAIR },
    ...pairs.flatMap((icon) => [
      { icon: icon.emoji, pair: icon.id },
      { icon: icon.emoji, pair: icon.id },
    ]),
  ];
  return shuffle(tiles);
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
