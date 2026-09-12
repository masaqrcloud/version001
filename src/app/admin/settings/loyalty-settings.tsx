"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

type MenuChoice = { id: string; name: string; category: string };

export function LoyaltySettings({
  loyaltyItemId,
}: {
  loyaltyItemId: string | null;
}) {
  const [itemId, setItemId] = useState(loyaltyItemId ?? "");
  const [items, setItems] = useState<MenuChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const next: MenuChoice[] = [];
      for (const category of data.categories ?? []) {
        for (const item of category.items ?? []) {
          next.push({
            id: item.id,
            name: item.name,
            category: category.name,
          });
        }
      }
      setItems(next);
    })();
  }, []);

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/admin/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loyaltyItemId: itemId || null }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Kaydedilemedi");
      return;
    }
    setSaved(true);
  }

  return (
    <Card className="mt-6 space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
          Müdavim
        </p>
        <h2 className="mt-1 font-serif text-2xl">İkram ürünü</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Misafir bu üründen 10 tane alınca bir ikram kazanır. Hediye olarak da
          aynı ürün verilir; garson karta bakıp ikramı verir.
        </p>
      </div>
      <div>
        <Label>Hediye / sayılacak ürün</Label>
        <select
          className="mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          value={itemId}
          onChange={(event) => {
            setItemId(event.target.value);
            setSaved(false);
          }}
        >
          <option value="">Kapalı — ürün seçilmedi</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.category} · {item.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-emerald-700">Müdavim ürünü kaydedildi.</p>
      ) : null}
      <Button onClick={() => void save()} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Müdavimi kaydet"}
      </Button>
    </Card>
  );
}
