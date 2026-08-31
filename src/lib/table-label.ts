/** Display name for a table. Plain numbers keep the "Masa" prefix; custom names do not. */
export function tableLabel(number: string | null | undefined) {
  if (!number?.trim()) return "Masa";
  return number
    .split(" + ")
    .map((part) => labelOne(part.trim()))
    .filter(Boolean)
    .join(" + ");
}

function labelOne(name: string) {
  if (!name) return "";
  if (/^masa\b/i.test(name)) return name;
  if (/^\d+[A-Za-z]?$/.test(name)) return `Masa ${name}`;
  return name;
}
