export const DEFAULT_AREA = "Salon";

export function areaName(area: string | null | undefined) {
  return area?.trim() || DEFAULT_AREA;
}

/** Salon veritabanında boş (null) tutulur. */
export function normalizeArea(area: string | null | undefined) {
  const name = area?.trim();
  if (!name || name.toLocaleLowerCase("tr") === DEFAULT_AREA.toLocaleLowerCase("tr")) {
    return null;
  }
  return name;
}

/** Salon her zaman ilk sekme, diğer bölgeler alfabetik. */
export function listAreas(tables: { area?: string | null }[], extra: string[] = []) {
  const names = new Set<string>([
    ...tables.map((table) => areaName(table.area)),
    ...extra.map((name) => areaName(name)),
  ]);
  return [...names].sort((a, b) => {
    if (a === DEFAULT_AREA) return -1;
    if (b === DEFAULT_AREA) return 1;
    return a.localeCompare(b, "tr");
  });
}

/** Bölgedeki masa sayısı arttıkça kartları küçült ki kroki taşmasın. */
export function floorScale(count: number) {
  if (count <= 6) return 1;
  return Math.max(0.5, Math.sqrt(6 / count));
}
