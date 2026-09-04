import {
  RATHER_CATEGORIES,
  RATHER_QUESTIONS,
  type RatherCategoryId,
  type RatherQuestion,
} from "@/lib/rather-data";

export { RATHER_CATEGORIES, RATHER_QUESTIONS, type RatherCategoryId, type RatherQuestion };

export const RATHER_ALL = "ALL";

export function categoryLabel(id: string) {
  if (id === RATHER_ALL) return "Tümü";
  return RATHER_CATEGORIES.find((row) => row.id === id)?.label ?? "Tümü";
}

export function isRatherCategory(id: string): id is RatherCategoryId {
  return RATHER_CATEGORIES.some((row) => row.id === id);
}

export function parseSeenIds(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseVotes(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function questionById(id: string) {
  return RATHER_QUESTIONS.find((row) => row.id === id) ?? null;
}

export function poolFor(category: string) {
  if (category === RATHER_ALL || !isRatherCategory(category)) {
    return RATHER_QUESTIONS;
  }
  return RATHER_QUESTIONS.filter((row) => row.cat === category);
}

export function pickRatherQuestion(category: string, seenIds: string[]) {
  const pool = poolFor(category);
  const seen = new Set(seenIds);
  const unused = pool.filter((row) => !seen.has(row.id));
  const from = unused.length ? unused : pool;
  return from[Math.floor(Math.random() * from.length)] ?? null;
}

export function categoryStats() {
  return [
    { id: RATHER_ALL, label: "Tümü", count: RATHER_QUESTIONS.length },
    ...RATHER_CATEGORIES.map((row) => ({
      id: row.id,
      label: row.label,
      count: RATHER_QUESTIONS.filter((item) => item.cat === row.id).length,
    })),
  ];
}
