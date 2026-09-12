/** Display name for a table. Plain numbers keep the "Masa" prefix; custom names do not. */
export function tableLabel(
  number: string | null | undefined,
  prefix = "Masa",
) {
  if (!number?.trim()) return prefix;
  return number
    .split(" + ")
    .map((part) => labelOne(part.trim(), prefix))
    .filter(Boolean)
    .join(" + ");
}

function labelOne(name: string, prefix: string) {
  if (!name) return "";
  if (/^masa\b/i.test(name)) return name;
  if (/^\d+[A-Za-z]?$/.test(name)) return `${prefix} ${name}`;
  return name;
}
