export const PASAPAROLA_LETTERS = [
  "A",
  "B",
  "C",
  "Ç",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "İ",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "Ö",
  "P",
  "R",
  "S",
  "Ş",
  "T",
  "U",
  "Ü",
  "V",
  "Y",
  "Z",
] as const;

export const ROUND_MS = 3 * 60 * 1000;
export const COUNTDOWN_MS = 5 * 1000;
export const PAS_MARK = "*";

export type PasaparolaModeId = "RACE" | "CLAIM";

export function foldAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}]/gu, "")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ı/g, "i")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

export function answersMatch(guess: string, expected: string) {
  const a = foldAnswer(guess);
  const b = foldAnswer(expected);
  return a.length > 0 && a === b;
}
