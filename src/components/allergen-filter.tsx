"use client";

import { ALLERGENS, type AllergenId } from "@/lib/nutrition";
import { useLocaleOptional } from "@/components/locale-provider";
import type { GuestMessage } from "@/lib/i18n-guest";

export function AllergenFilter({
  hideAllergens,
  hideAlcohol,
  hidePork,
  onChange,
}: {
  hideAllergens: AllergenId[];
  hideAlcohol: boolean;
  hidePork: boolean;
  onChange: (next: {
    hideAllergens: AllergenId[];
    hideAlcohol: boolean;
    hidePork: boolean;
  }) => void;
}) {
  const loc = useLocaleOptional();
  const t = loc?.t;
  const active = hideAllergens.length > 0 || hideAlcohol || hidePork;

  function toggle(id: AllergenId) {
    onChange({
      hideAllergens: hideAllergens.includes(id)
        ? hideAllergens.filter((item) => item !== id)
        : [...hideAllergens, id],
      hideAlcohol,
      hidePork,
    });
  }

  function allergenName(id: AllergenId) {
    const key = `allergen_${id}` as GuestMessage;
    return t ? t(key) : ALLERGENS.find((row) => row.id === id)?.label ?? id;
  }

  return (
    <details className="rounded-2xl border border-[var(--line)] bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {t ? t("allergenFilter") : "Alerjen filtresi"}
        {active ? (
          <span className="ml-2 text-xs font-normal text-[var(--accent)]">
            {t ? t("filterOn") : "açık"}
          </span>
        ) : null}
      </summary>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {t
          ? t("allergenHint")
          : "Seçtiğin alerjeni içeren ürünler gizlenir. Glutensizleri görmek için Gluten’i işaretle."}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALLERGENS.map((allergen) => {
          const selected = hideAllergens.includes(allergen.id);
          const label = allergenName(allergen.id);
          return (
            <button
              key={allergen.id}
              type="button"
              onClick={() => toggle(allergen.id)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {selected
                ? t
                  ? t("hideNamed", { name: label })
                  : `${label} gizle`
                : label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({
              hideAllergens,
              hideAlcohol: !hideAlcohol,
              hidePork,
            })
          }
          className={`rounded-full border px-3 py-1 text-xs ${
            hideAlcohol
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          {t ? t("hideAlcohol") : "Alkol içerenleri gizle"}
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({
              hideAllergens,
              hideAlcohol,
              hidePork: !hidePork,
            })
          }
          className={`rounded-full border px-3 py-1 text-xs ${
            hidePork
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          {t ? t("hidePork") : "Domuz türevi içerenleri gizle"}
        </button>
      </div>
    </details>
  );
}
