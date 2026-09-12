"use client";

import {
  allergenLabel,
  animalSourceLabel,
  formatPortionCalories,
  type AllergenId,
  type NutritionInfo,
} from "@/lib/nutrition";
import { useLocaleOptional } from "@/components/locale-provider";
import type { GuestMessage } from "@/lib/i18n-guest";

export function NutritionLabels({
  item,
  compact = false,
}: {
  item: NutritionInfo;
  compact?: boolean;
}) {
  const loc = useLocaleOptional();
  const sourceId = item.animalSource;
  const source = loc
    ? sourceId
      ? loc.t(`meat_${sourceId}` as GuestMessage)
      : null
    : animalSourceLabel(sourceId);
  const tags = [
    ...item.allergens.map((id) => ({
      key: id,
      text: loc
        ? loc.t(`allergen_${id}` as GuestMessage)
        : allergenLabel(id as AllergenId),
      tone: "allergen" as const,
    })),
    ...(source ? [{ key: "meat", text: source, tone: "meat" as const }] : []),
    ...(item.containsAlcohol
      ? [
          {
            key: "alcohol",
            text: loc ? loc.t("alcohol") : "Alkol",
            tone: "warn" as const,
          },
        ]
      : []),
    ...(item.containsPork
      ? [
          {
            key: "pork",
            text: loc ? loc.t("pork") : "Domuz türevi",
            tone: "warn" as const,
          },
        ]
      : []),
  ];

  if (!tags.length && item.calories == null) return null;

  const caloriesText = loc
    ? item.calories != null
      ? loc.t("kcalPortion", { n: item.calories })
      : null
    : formatPortionCalories(item.calories);

  return (
    <div className={compact ? "mt-1 space-y-1" : "mt-2 space-y-1.5"}>
      {tags.length ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.key}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                tag.tone === "warn"
                  ? "bg-red-100 text-red-800"
                  : tag.tone === "meat"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-black/5 text-[var(--ink)]"
              }`}
            >
              {tag.text}
            </span>
          ))}
        </div>
      ) : null}
      {!compact && caloriesText ? (
        <p className="text-xs text-[var(--muted)]">{caloriesText}</p>
      ) : null}
    </div>
  );
}

export function CalorieBesidePrice({
  price,
  calories,
}: {
  price: string;
  calories: number | null;
}) {
  const loc = useLocaleOptional();
  return (
    <p className="mt-2 text-sm">
      {price}
      {calories != null ? (
        <span className="ml-2 text-[var(--muted)]">
          {loc ? loc.t("kcalPortion", { n: calories }) : `${calories} kcal / porsiyon`}
        </span>
      ) : null}
    </p>
  );
}
