import { prisma } from "@/lib/db";
import words from "@/lib/pasaparola-words.json";
import extra from "@/lib/pasaparola-words-extra.json";
import { PASAPAROLA_LETTERS, answersMatch } from "@/lib/pasaparola-shared";

export {
  PASAPAROLA_LETTERS,
  PAS_MARK,
  ROUND_MS,
  CLAIM_LETTER_MS,
  COUNTDOWN_MS,
  answersMatch,
  foldAnswer,
  isPasGuess,
  type PasaparolaModeId,
} from "@/lib/pasaparola-shared";

type SeedWord = { letter: string; word: string; clue: string };

export async function ensurePasaparolaWords() {
  const seed = [...(words as SeedWord[]), ...(extra as SeedWord[])];
  if (!seed.length) return;
  const existing = await prisma.pasaparolaWord.findMany({
    select: { letter: true, word: true },
  });
  const have = new Set(existing.map((row) => `${row.letter}:${row.word}`));
  const add = seed.filter((row) => !have.has(`${row.letter}:${row.word}`));
  if (add.length) await prisma.pasaparolaWord.createMany({ data: add });
}

export function parseJsonRecord(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value || "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function scoreAnswers(
  answers: Record<string, string>,
  expected: Record<string, string>,
) {
  let score = 0;
  for (const letter of PASAPAROLA_LETTERS) {
    const guess = answers[letter];
    if (guess && answersMatch(guess, expected[letter] ?? "")) score += 1;
  }
  return score;
}

export function nextUnclaimedLetter(
  claims: Record<string, string>,
  current: string,
) {
  const from = PASAPAROLA_LETTERS.indexOf(
    current as (typeof PASAPAROLA_LETTERS)[number],
  );
  const rotated = [
    ...PASAPAROLA_LETTERS.slice(from + 1),
    ...PASAPAROLA_LETTERS.slice(0, Math.max(from, 0)),
  ];
  return rotated.find((letter) => !claims[letter]) ?? null;
}
