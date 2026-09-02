"use client";

import { Input, Label } from "@/components/ui/input";
import {
  ALLERGENS,
  ANIMAL_SOURCES,
  type AllergenId,
  type NutritionInfo,
} from "@/lib/nutrition";

export function NutritionEditor({
  value,
  onChange,
  caloriesRequired,
}: {
  value: NutritionInfo;
  onChange: (next: NutritionInfo) => void;
  caloriesRequired?: boolean;
}) {
  function toggleAllergen(id: AllergenId) {
    const allergens = value.allergens.includes(id)
      ? value.allergens.filter((item) => item !== id)
      : [...value.allergens, id];
    onChange({ ...value, allergens });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Kalori (kcal / porsiyon){caloriesRequired ? " *" : ""}</Label>
        <Input
          type="number"
          min={0}
          max={99999}
          required={caloriesRequired}
          value={value.calories ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              calories:
                event.target.value === ""
                  ? null
                  : Math.max(0, Math.round(Number(event.target.value)) || 0),
            })
          }
          placeholder="Örn. 420"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Porsiyon başına enerji değeri. Mevzuat için girilmesi gerekir.
        </p>
      </div>

      <div>
        <Label>Hayvansal kaynak</Label>
        <select
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          value={value.animalSource ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              animalSource: event.target.value || null,
            })
          }
        >
          {ANIMAL_SOURCES.map((source) => (
            <option key={source.id || "none"} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Et ürünlerinde dana, kuzu, tavuk, hindi vb. kaynağı belirt.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ToggleFlag
          label="Alkol içerir"
          on={value.containsAlcohol}
          onToggle={() =>
            onChange({ ...value, containsAlcohol: !value.containsAlcohol })
          }
        />
        <ToggleFlag
          label="Domuz türevi"
          on={value.containsPork}
          onToggle={() =>
            onChange({ ...value, containsPork: !value.containsPork })
          }
        />
      </div>

      <div>
        <Label>14 temel alerjen</Label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ALLERGENS.map((allergen) => {
            const selected = value.allergens.includes(allergen.id);
            return (
              <button
                key={allergen.id}
                type="button"
                title={allergen.legal}
                onClick={() => toggleAllergen(allergen.id)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {allergen.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Üründe bulunan alerjenleri işaretle. Misafir menüde bunları görür.
        </p>
      </div>
    </div>
  );
}

function ToggleFlag({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-xl border px-3 py-2 text-left text-sm ${
        on
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-[var(--line)] bg-white text-[var(--ink)]"
      }`}
    >
      <span className="block text-[11px] text-[var(--muted)]">{label}</span>
      <span className="font-medium">{on ? "Evet" : "Hayır"}</span>
    </button>
  );
}
