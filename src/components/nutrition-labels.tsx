import {
  allergenLabel,
  animalSourceLabel,
  formatPortionCalories,
  type NutritionInfo,
} from "@/lib/nutrition";

export function NutritionLabels({
  item,
  compact = false,
}: {
  item: NutritionInfo;
  compact?: boolean;
}) {
  const source = animalSourceLabel(item.animalSource);
  const tags = [
    ...item.allergens.map((id) => ({
      key: id,
      text: allergenLabel(id),
      tone: "allergen" as const,
    })),
    ...(source
      ? [{ key: "meat", text: source, tone: "meat" as const }]
      : []),
    ...(item.containsAlcohol
      ? [{ key: "alcohol", text: "Alkol", tone: "warn" as const }]
      : []),
    ...(item.containsPork
      ? [{ key: "pork", text: "Domuz türevi", tone: "warn" as const }]
      : []),
  ];

  if (!tags.length && item.calories == null) return null;

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
      {!compact && formatPortionCalories(item.calories) ? (
        <p className="text-xs text-[var(--muted)]">
          {formatPortionCalories(item.calories)}
        </p>
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
  return (
    <p className="mt-2 text-sm">
      {price}
      {calories != null ? (
        <span className="ml-2 text-[var(--muted)]">
          {calories} kcal / porsiyon
        </span>
      ) : null}
    </p>
  );
}
