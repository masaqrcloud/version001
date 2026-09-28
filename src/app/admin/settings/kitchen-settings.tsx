"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function KitchenSettings({
  kitchenCapacity,
}: {
  kitchenCapacity: number;
}) {
  const [capacity, setCapacity] = useState(String(kitchenCapacity));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = Number(capacity);
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      setError("1 ile 20 arasında bir sayı yaz");
      return;
    }
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/admin/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kitchenCapacity: value }),
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
          Mutfak
        </p>
        <h2 className="mt-1 font-serif text-2xl">Dürüst bekleme süresi</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Misafir siparişinde “~14 dk” gibi gerçek bir süre görür. Süre,
          mekânının son 30 gündeki hazırlama sürelerinden ve mutfaktaki
          sıradan hesaplanır. Yeni ürünlerde menüde girdiğin hazırlanma süresi
          kullanılır.
        </p>
      </div>
      <div className="max-w-xs">
        <Label htmlFor="kitchen-capacity">
          Mutfak aynı anda kaç sipariş hazırlayabilir?
        </Label>
        <Input
          id="kitchen-capacity"
          type="number"
          min="1"
          max="20"
          value={capacity}
          onChange={(event) => {
            setCapacity(event.target.value);
            setSaved(false);
          }}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Yoğun saatte sıra bu sayıya göre hesaplanır. Emin değilsen 3 bırak.
        </p>
      </div>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
      {saved ? <p className="text-sm text-ok">Mutfak ayarı kaydedildi.</p> : null}
      <Button onClick={() => void save()} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Mutfak ayarını kaydet"}
      </Button>
    </Card>
  );
}
