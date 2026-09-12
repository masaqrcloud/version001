import { prisma } from "@/lib/db";

const CATEGORY_EN: Record<string, string> = {
  aperatifler: "Snacks",
  atıştırmalıklar: "Snacks",
  "ana yemek": "Main course",
  "ana yemekler": "Mains",
  başlangıç: "Starter",
  başlangıçlar: "Starters",
  burger: "Burger",
  burgerler: "Burgers",
  çorba: "Soup",
  çorbalar: "Soups",
  "deniz ürünleri": "Seafood",
  dürüm: "Wrap",
  dürümler: "Wraps",
  ızgara: "Grill",
  ızgaralar: "Grill",
  içecek: "Drink",
  içecekler: "Drinks",
  kahvaltı: "Breakfast",
  kahvaltılar: "Breakfast",
  kebap: "Kebab",
  kebaplar: "Kebabs",
  makarna: "Pasta",
  makarnalar: "Pastas",
  meze: "Meze",
  mezeler: "Mezes",
  pide: "Pide",
  pideler: "Pides",
  pizza: "Pizza",
  pizzalar: "Pizzas",
  salata: "Salad",
  salatalar: "Salads",
  "sıcak içecekler": "Hot drinks",
  "soğuk içecekler": "Cold drinks",
  tatlı: "Dessert",
  tatlılar: "Desserts",
  vejetaryen: "Vegetarian",
  "az pişmiş": "Rare",
  "orta az": "Medium rare",
  orta: "Medium",
  "orta iyi": "Medium well",
  "iyi pişmiş": "Well done",
  "ekstra peynir": "Extra cheese",
  acılı: "Spicy",
  acısız: "Mild",
  soğansız: "No onion",
  "ekstra sos": "Extra sauce",
  porsiyon: "Portion",
  küçük: "Small",
  büyük: "Large",
};

const running = new Map<string, Promise<MenuEnglishPayload>>();

export type MenuEnglishPayload = {
  categories: { id: string; nameEn: string | null }[];
  items: { id: string; nameEn: string | null; descriptionEn: string | null }[];
  options: { id: string; nameEn: string | null }[];
};

function keyOf(text: string) {
  return text.trim().toLocaleLowerCase("tr-TR");
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function translateTrToEn(text: string | null | undefined) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return null;

  const known = CATEGORY_EN[keyOf(trimmed)];
  if (known) return known;

  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", trimmed.slice(0, 500));
    url.searchParams.set("langpair", "tr|en");
    url.searchParams.set("de", "masaqr.cloud@gmail.com");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const raw = String(data.responseData?.translatedText ?? "").trim();
    if (!raw || /MYMEMORY WARNING/i.test(raw)) return null;
    return decodeEntities(raw);
  } catch {
    return null;
  }
}

export async function englishForMenuFields(
  input: { name?: string; description?: string | null },
  existing?: {
    name: string;
    description: string | null;
    nameEn: string | null;
    descriptionEn: string | null;
  },
) {
  const name = input.name ?? existing?.name ?? "";
  const description =
    input.description === undefined
      ? (existing?.description ?? null)
      : input.description;
  const nameChanged =
    !existing ||
    !existing.nameEn ||
    (input.name !== undefined && input.name !== existing.name);
  const descriptionChanged =
    !existing ||
    (description && !existing.descriptionEn) ||
    (input.description !== undefined && input.description !== existing.description);

  const [nameEn, descriptionEn] = await Promise.all([
    nameChanged ? translateTrToEn(name) : existing?.nameEn ?? null,
    description
      ? descriptionChanged
        ? translateTrToEn(description)
        : existing?.descriptionEn ?? null
      : null,
  ]);

  return { nameEn, descriptionEn };
}

export async function englishForOptionGroups(
  groups?: { name: string; options: { name: string }[] }[],
) {
  if (!groups?.length) return [];
  const texts = [...new Set(groups.flatMap((group) => [group.name, ...group.options.map((option) => option.name)]))];
  const map = new Map<string, string | null>();
  await mapPool(texts, 4, async (text) => {
    const nameEn = await translateTrToEn(text);
    map.set(text, nameEn);
    return nameEn;
  });
  return groups.map((group) => ({
    nameEn: map.get(group.name) ?? null,
    options: group.options.map((option) => ({
      nameEn: map.get(option.name) ?? null,
    })),
  }));
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) {
  const out: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      out[current] = await fn(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) || 0 }, () => worker()),
  );
  return out;
}

async function fillVenueEnglish(venueId: string): Promise<MenuEnglishPayload> {
  const categories = await prisma.menuCategory.findMany({
    where: { venueId },
    include: { items: true },
  });

  const categoryJobs = categories
    .filter((category) => !category.nameEn)
    .map((category) => ({ id: category.id, text: category.name }));
  await mapPool(categoryJobs, 4, async (job) => {
    const nameEn = await translateTrToEn(job.text);
    if (nameEn) {
      await prisma.menuCategory.update({
        where: { id: job.id },
        data: { nameEn },
      });
    }
    return nameEn;
  });

  const itemJobs = categories.flatMap((category) =>
    category.items
      .filter(
        (item) =>
          !item.nameEn || (item.description && !item.descriptionEn),
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        needName: !item.nameEn,
        needDescription: Boolean(item.description && !item.descriptionEn),
      })),
  );

  await mapPool(itemJobs.slice(0, 200), 4, async (job) => {
    const data: { nameEn?: string; descriptionEn?: string } = {};
    if (job.needName) {
      const nameEn = await translateTrToEn(job.name);
      if (nameEn) data.nameEn = nameEn;
    }
    if (job.needDescription && job.description) {
      const descriptionEn = await translateTrToEn(job.description);
      if (descriptionEn) data.descriptionEn = descriptionEn;
    }
    if (Object.keys(data).length) {
      await prisma.menuItem.update({ where: { id: job.id }, data });
    }
    return data;
  });

  const optionGroups = await prisma.menuOptionGroup.findMany({
    where: { menuItem: { category: { venueId } } },
    include: { options: true },
  });
  const optionJobs = [
    ...optionGroups
      .filter((group) => !group.nameEn)
      .map((group) => ({ kind: "group" as const, id: group.id, text: group.name })),
    ...optionGroups.flatMap((group) =>
      group.options
        .filter((option) => !option.nameEn)
        .map((option) => ({
          kind: "option" as const,
          id: option.id,
          text: option.name,
        })),
    ),
  ];
  await mapPool(optionJobs.slice(0, 200), 4, async (job) => {
    const nameEn = await translateTrToEn(job.text);
    if (!nameEn) return null;
    if (job.kind === "group") {
      await prisma.menuOptionGroup.update({
        where: { id: job.id },
        data: { nameEn },
      });
    } else {
      await prisma.menuOption.update({
        where: { id: job.id },
        data: { nameEn },
      });
    }
    return nameEn;
  });

  const fresh = await prisma.menuCategory.findMany({
    where: { venueId },
    include: {
      items: {
        select: {
          id: true,
          nameEn: true,
          descriptionEn: true,
          optionGroups: {
            select: {
              id: true,
              nameEn: true,
              options: { select: { id: true, nameEn: true } },
            },
          },
        },
      },
    },
  });

  return {
    categories: fresh.map((category) => ({
      id: category.id,
      nameEn: category.nameEn,
    })),
    items: fresh.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        nameEn: item.nameEn,
        descriptionEn: item.descriptionEn,
      })),
    ),
    options: fresh.flatMap((category) =>
      category.items.flatMap((item) =>
        item.optionGroups.flatMap((group) => [
          { id: group.id, nameEn: group.nameEn },
          ...group.options.map((option) => ({
            id: option.id,
            nameEn: option.nameEn,
          })),
        ]),
      ),
    ),
  };
}

export function backfillVenueEnglish(venueId: string) {
  const existing = running.get(venueId);
  if (existing) return existing;
  const job = fillVenueEnglish(venueId).finally(() => running.delete(venueId));
  running.set(venueId, job);
  return job;
}
