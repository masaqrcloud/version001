"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tableLabel } from "@/lib/table-label";
import { formatTRY } from "@/lib/utils";
import { NutritionLabels } from "@/components/nutrition-labels";
import type { AllergenId } from "@/lib/nutrition";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  soldOut: boolean;
  allergens: AllergenId[];
  animalSource: string | null;
  containsAlcohol: boolean;
  containsPork: boolean;
  calories: number | null;
  optionGroups: {
    id: string;
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
};

type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  optionIds: string[];
  optionNames: string[];
};

export function WaiterOrderForm({
  sessionId,
  tableId,
  tableNumber,
  categories,
  editOrder,
}: {
  sessionId?: string;
  tableId?: string;
  tableNumber: string;
  categories: { id: string; name: string; items: MenuItem[] }[];
  editOrder?: {
    id: string;
    items: {
      menuItemId: string;
      name: string;
      price: number;
      quantity: number;
      note: string | null;
      optionIds: string[];
      optionNames: string[];
    }[];
  };
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>(() => {
    const lines: CartLine[] = [];
    for (const item of editOrder?.items ?? []) {
      const key = `${item.menuItemId}:${item.optionIds.slice().sort().join(",")}`;
      const existing = lines.find((line) => line.key === key);
      if (existing) {
        existing.quantity += item.quantity;
        if (item.note && !existing.note) existing.note = item.note;
        continue;
      }
      lines.push({
        key,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note ?? "",
        optionIds: item.optionIds,
        optionNames: item.optionNames,
      });
    }
    return lines;
  });
  const [note, setNote] = useState("");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<MenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const visible = useMemo(
    () => categories.filter((category) => category.items.length > 0),
    [categories],
  );

  function addConfigured(item: MenuItem, optionIds: string[]) {
    const options = item.optionGroups
      .flatMap((group) => group.options)
      .filter((option) => optionIds.includes(option.id));
    const price =
      item.price + options.reduce((sum, option) => sum + option.priceDelta, 0);
    const key = `${item.id}:${optionIds.slice().sort().join(",")}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key,
          menuItemId: item.id,
          name: item.name,
          price,
          quantity: 1,
          note: "",
          optionIds,
          optionNames: options.map((option) => option.name),
        },
      ];
    });
    setConfiguring(null);
    setSelectedOptionIds([]);
  }

  function addItem(item: MenuItem) {
    if (item.soldOut) return;
    if (item.optionGroups.length) {
      setConfiguring(item);
      setSelectedOptionIds([]);
      return;
    }
    addConfigured(item, []);
  }

  function configurationValid(item: MenuItem) {
    return item.optionGroups.every((group) => {
      const count = group.options.filter((option) =>
        selectedOptionIds.includes(option.id),
      ).length;
      const minimum = group.required
        ? Math.max(1, group.minSelections)
        : group.minSelections;
      return count >= minimum && count <= group.maxSelections;
    });
  }

  async function submit() {
    if (!cart.length) return;
    setBusy(true);
    setError(null);
    const payload = {
      items: cart.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        note: [note.trim(), line.note.trim()].filter(Boolean).join(" · ") || undefined,
        optionIds: line.optionIds,
      })),
      ...(!editOrder && guestName.trim().length >= 2
        ? { guestName: guestName.trim() }
        : {}),
    };
    const response = await fetch(
      editOrder
        ? `/api/staff/orders/${editOrder.id}`
        : sessionId
          ? `/api/staff/sessions/${sessionId}/orders`
          : "/api/staff/sessions",
      {
        method: editOrder ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(!editOrder && tableId ? { tableId } : {}),
        }),
      },
    );
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(json.error ?? (editOrder ? "Sipariş güncellenemedi" : "Sipariş gönderilemedi"));
      return;
    }
    const nextSessionId = json.sessionId ?? sessionId;
    if (!nextSessionId) {
      setError("Sipariş alındı ama masa açılamadı");
      return;
    }
    router.push(`/staff/waiter/${nextSessionId}`);
  }

  return (
    <div className="pb-28">
      <Link
        href={sessionId ? `/staff/waiter/${sessionId}` : "/staff/waiter"}
        className="text-sm text-[var(--accent)]"
      >
        ← {tableLabel(tableNumber)}
      </Link>
      <h1 className="mt-3 font-serif text-3xl">
        {editOrder ? "Siparişi düzenle" : "Sipariş yaz"}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {editOrder
          ? "Bekleyen bilet değişir, mutfak güncel hali görür."
          : `QR yok. Mutfağa gönderince masa dolu olur; sadece forma girmek masayı açmaz.`}
      </p>
      {editOrder ? null : (
        <Input
          className="mt-4"
          placeholder="Misafir adı (isteğe bağlı, ör. Amca)"
          maxLength={40}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      )}

      {cart.length ? (
        <Card className="mt-6 space-y-3 p-4">
          <p className="font-medium">{editOrder ? "Bu bilet" : "Sepet"}</p>
          {cart.map((line) => (
            <div key={line.key} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p>
                  {line.quantity}× {line.name}
                </p>
                {line.optionNames.length ? (
                  <p className="text-xs text-[var(--muted)]">
                    {line.optionNames.join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span>{formatTRY(line.price * line.quantity)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setCart((current) =>
                      current.flatMap((entry) => {
                        if (entry.key !== line.key) return [entry];
                        if (entry.quantity <= 1) return [];
                        return [{ ...entry, quantity: entry.quantity - 1 }];
                      }),
                    )
                  }
                >
                  −
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setCart((current) =>
                      current.map((entry) =>
                        entry.key === line.key
                          ? { ...entry, quantity: Math.min(30, entry.quantity + 1) }
                          : entry,
                      ),
                    )
                  }
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setCart((current) =>
                      current.filter((entry) => entry.key !== line.key),
                    )
                  }
                >
                  Sil
                </Button>
              </div>
            </div>
          ))}
          <Input
            placeholder="Not (az şeker, soğansız…)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Card>
      ) : null}

      <div className="mt-6 space-y-6">
        {visible.map((category) => (
          <section key={category.id}>
            <h2 className="mb-3 font-medium">{category.name}</h2>
            <div className="space-y-2">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.soldOut}
                  onClick={() => addItem(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left disabled:opacity-50"
                >
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    {item.description ? (
                      <span className="block text-xs text-[var(--muted)]">
                        {item.description}
                      </span>
                    ) : null}
                    <NutritionLabels item={item} compact />
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    {item.soldOut
                      ? "Tükendi"
                      : item.calories != null
                        ? `${formatTRY(item.price)} · ${item.calories} kcal`
                        : formatTRY(item.price)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {configuring ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <Card className="w-full max-w-md p-5">
            <h2 className="font-serif text-2xl">{configuring.name}</h2>
            <NutritionLabels item={configuring} />
            {configuring.optionGroups.map((group) => (
              <div key={group.id} className="mt-4">
                <p className="text-sm font-medium">{group.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const on = selectedOptionIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-sm ${
                          on
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--line)]"
                        }`}
                        onClick={() => {
                          setSelectedOptionIds((current) => {
                            if (current.includes(option.id)) {
                              return current.filter((id) => id !== option.id);
                            }
                            if (group.maxSelections === 1) {
                              const groupIds = new Set(
                                group.options.map((entry) => entry.id),
                              );
                              return [
                                ...current.filter((id) => !groupIds.has(id)),
                                option.id,
                              ];
                            }
                            return [...current, option.id];
                          });
                        }}
                      >
                        {option.name}
                        {option.priceDelta
                          ? ` · ${formatTRY(option.priceDelta)}`
                          : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfiguring(null)}>
                Vazgeç
              </Button>
              <Button
                disabled={!configurationValid(configuring)}
                onClick={() => addConfigured(configuring, selectedOptionIds)}
              >
                Ekle
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {cart.length ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--bg)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted)]">
                {cart.reduce((sum, line) => sum + line.quantity, 0)} ürün
              </p>
              <p className="font-serif text-2xl">{formatTRY(total)}</p>
            </div>
            <Button disabled={busy} onClick={() => void submit()}>
              {busy
                ? "Kaydediliyor…"
                : editOrder
                  ? "Mutfağa güncelle"
                  : "Mutfağa gönder"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
