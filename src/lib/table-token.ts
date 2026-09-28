import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

export function tableQrBase(venueSlug: string, number: string) {
  const trimmed = number.trim();
  const part = /^\d+$/.test(trimmed) ? `masa-${trimmed}` : slugify(trimmed) || "masa";
  return `${venueSlug}-${part}`;
}

export async function uniqueTableQrToken(venueSlug: string, number: string) {
  const base = tableQrBase(venueSlug, number);
  for (let attempt = 1; attempt < 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const taken = await prisma.table.findFirst({
      where: { OR: [{ qrToken: candidate }, { legacyQrToken: candidate }] },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
