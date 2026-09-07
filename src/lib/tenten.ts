import { TENTEN_QUESTIONS, type TenTenPrompt } from "@/lib/tenten-data";

export { TENTEN_QUESTIONS, type TenTenPrompt };

export function parseSeenIds(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseScores(value: string) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const scores: Record<string, number> = {};
    for (const [id, raw] of Object.entries(parsed)) {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= 10) scores[id] = n;
    }
    return scores;
  } catch {
    return {};
  }
}

export function clampScore(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}

export function promptById(id: string) {
  return TENTEN_QUESTIONS.find((row) => row.id === id) ?? null;
}

export function pickTenTenPrompt(seenIds: string[]) {
  const seen = new Set(seenIds);
  const unused = TENTEN_QUESTIONS.filter((row) => !seen.has(row.id));
  const from = unused.length ? unused : TENTEN_QUESTIONS;
  return from[Math.floor(Math.random() * from.length)] ?? null;
}

export function averageOf(scores: Record<string, number>) {
  const values = Object.values(scores);
  if (!values.length) return null;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
