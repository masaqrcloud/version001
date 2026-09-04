import { prisma } from "@/lib/db";
import words from "@/lib/pasaparola-words.json";
import { PASAPAROLA_LETTERS, answersMatch } from "@/lib/pasaparola-shared";

export {
  PASAPAROLA_LETTERS,
  ROUND_MS,
  answersMatch,
  foldAnswer,
  type PasaparolaModeId,
} from "@/lib/pasaparola-shared";

type SeedWord = { letter: string; word: string; clue: string };

export async function ensurePasaparolaWords() {
  const count = await prisma.pasaparolaWord.count();
  if (count > 0) return;
  const seed = words as SeedWord[];
  if (!seed.length) return;
  await prisma.pasaparolaWord.createMany({ data: seed });
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
