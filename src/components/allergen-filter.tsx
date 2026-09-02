"use client";

import { ALLERGENS, type AllergenId } from "@/lib/nutrition";

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
  const active =
    hideAllergens.length > 0 || hideAlcohol || hidePork;

  function toggle(id: AllergenId) {
    onChange({
      hideAllergens: hideAllergens.includes(id)
        ? hideAllergens.filter((item) => item !== id)
        : [...hideAllergens, id],
      hideAlcohol,
      hidePork,
    });
  }

  return (
    <details className="rounded-2xl border border-[var(--line)] bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Alerjen filtresi
        {active ? (
          <span className="ml-2 text-xs font-normal text-[var(--accent)]">
            açık
          </span>
        ) : null}
      </summary>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Seçtiğin alerjeni içeren ürünler gizlenir. Glutensizleri görmek için
        Gluten’i işaretle.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALLERGENS.map((allergen) => {
          const selected = hideAllergens.includes(allergen.id);
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
              {selected ? `${allergen.label} gizle` : allergen.label}
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
          Alkol içerenleri gizle
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
          Domuz türevi içerenleri gizle
        </button>
      </div>
    </details>
  );
}
