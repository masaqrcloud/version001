/** Digits only from a phone-ish string. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize a Turkish mobile to E.164 (+905XXXXXXXXX).
 * Accepts 05XXXXXXXXX, 5XXXXXXXXX, 905XXXXXXXXX, +905XXXXXXXXX.
 */
export function normalizeTrMobile(value: string): string | null {
  let digits = phoneDigits(value);
  if (digits.startsWith("90") && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (!/^5\d{9}$/.test(digits)) return null;
  return `+90${digits}`;
}

export function isTrMobile(value: string): boolean {
  return normalizeTrMobile(value) !== null;
}

/** Display mask: 05XX XXX XX XX */
export function formatTrMobileDisplay(value: string): string {
  let digits = phoneDigits(value);
  if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("5")) digits = `0${digits}`;
  digits = digits.slice(0, 11);

  const parts = [
    digits.slice(0, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11),
  ].filter((part) => part.length > 0);

  return parts.join(" ");
}
