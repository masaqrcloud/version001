import { z } from "zod";

export const ALLERGENS = [
  { id: "gluten", label: "Gluten", legal: "Gluten içeren tahıllar" },
  { id: "crustaceans", label: "Kabuklular", legal: "Kabuklular" },
  { id: "egg", label: "Yumurta", legal: "Yumurta" },
  { id: "fish", label: "Balık", legal: "Balık" },
  { id: "peanut", label: "Yer fıstığı", legal: "Yer fıstığı" },
  { id: "soy", label: "Soya", legal: "Soya" },
  { id: "milk", label: "Süt / Laktoz", legal: "Süt ve süt ürünleri (laktoz dahil)" },
  { id: "nuts", label: "Kuruyemişler", legal: "Sert kabuklu meyveler" },
  { id: "celery", label: "Kereviz", legal: "Kereviz" },
  { id: "mustard", label: "Hardal", legal: "Hardal" },
  { id: "sesame", label: "Susam", legal: "Susam" },
  { id: "sulphites", label: "Sülfitler", legal: "Kükürt dioksit / sülfitler" },
  { id: "lupin", label: "Lupin / Acıbakla", legal: "Acı bakla (lupin)" },
  { id: "molluscs", label: "Yumuşakçalar", legal: "Yumuşakçalar" },
] as const;

export type AllergenId = (typeof ALLERGENS)[number]["id"];

export const ALLERGEN_IDS = ALLERGENS.map((item) => item.id) as [
  AllergenId,
  ...AllergenId[],
];

export const ANIMAL_SOURCES = [
  { id: "", label: "Et değil / yok" },
  { id: "dana", label: "Dana" },
  { id: "kuzu", label: "Kuzu" },
  { id: "tavuk", label: "Tavuk" },
  { id: "hindi", label: "Hindi" },
  { id: "balik", label: "Balık" },
  { id: "karisik", label: "Karışık et" },
  { id: "diger", label: "Diğer hayvansal" },
] as const;

export type AnimalSourceId = Exclude<(typeof ANIMAL_SOURCES)[number]["id"], "">;

export type NutritionInfo = {
  allergens: AllergenId[];
  animalSource: string | null;
  containsAlcohol: boolean;
  containsPork: boolean;
  calories: number | null;
};

export const EMPTY_NUTRITION: NutritionInfo = {
  allergens: [],
  animalSource: null,
  containsAlcohol: false,
  containsPork: false,
  calories: null,
};

export function isAllergenId(value: string): value is AllergenId {
  return ALLERGENS.some((item) => item.id === value);
}

export function parseAllergens(value: unknown): AllergenId[] {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : [];
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((item): item is AllergenId => typeof item === "string" && isAllergenId(item)))];
}

export function nutritionFromRow(row: {
  allergens?: unknown;
  animalSource?: string | null;
  containsAlcohol?: boolean | null;
  containsPork?: boolean | null;
  calories?: number | null;
}): NutritionInfo {
  const source = row.animalSource?.trim() || null;
  return {
    allergens: parseAllergens(row.allergens),
    animalSource: source && ANIMAL_SOURCES.some((item) => item.id === source)
      ? source
      : null,
    containsAlcohol: Boolean(row.containsAlcohol),
    containsPork: Boolean(row.containsPork),
    calories:
      typeof row.calories === "number" && Number.isFinite(row.calories)
        ? Math.max(0, Math.round(row.calories))
        : null,
  };
}

export function allergenLabel(id: AllergenId) {
  return ALLERGENS.find((item) => item.id === id)?.label ?? id;
}

export function animalSourceLabel(id: string | null) {
  if (!id) return null;
  return ANIMAL_SOURCES.find((item) => item.id === id)?.label ?? null;
}

export function formatPortionCalories(calories: number | null) {
  if (calories == null) return null;
  return `${calories} kcal / porsiyon`;
}

export function itemHiddenByFilter(
  item: NutritionInfo,
  hideAllergens: AllergenId[],
  hideAlcohol: boolean,
  hidePork: boolean,
) {
  if (hideAlcohol && item.containsAlcohol) return true;
  if (hidePork && item.containsPork) return true;
  return hideAllergens.some((id) => item.allergens.includes(id));
}

export const nutritionFieldsSchema = z.object({
  allergens: z.array(z.enum(ALLERGEN_IDS)).max(14).optional(),
  animalSource: z
    .enum(["dana", "kuzu", "tavuk", "hindi", "balik", "karisik", "diger"])
    .nullable()
    .optional(),
  containsAlcohol: z.boolean().optional(),
  containsPork: z.boolean().optional(),
  calories: z.number().int().min(0).max(99999).nullable().optional(),
});

