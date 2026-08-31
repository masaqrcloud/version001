"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { usePoll } from "@/lib/poll";

type StockStatus = "out" | "low" | "ok" | "off";
type Filter = "all" | "out" | "low" | "ok" | "off";
type Reason = "ORDER" | "CANCEL" | "RECEIVE" | "WASTE" | "COUNT" | "ADJUST";

type StockItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  available: boolean;
  categoryId: string;
  categoryName: string;
  stockTracked: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  soldToday: number;
  inCarts: number;
  status: StockStatus;
};

type Movement = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  delta: number;
  quantityAfter: number;
  reason: Reason;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

type StockResponse = {
  summary: {
    tracked: number;
    untracked: number;
    out: number;
    low: number;
    ok: number;
  };
  items: StockItem[];
  movements: Movement[];
};

const reasonLabel: Record<Reason, string> = {
  ORDER: "Sipariş",
  CANCEL: "İptal iadesi",
  RECEIVE: "Teslimat",
  WASTE: "Fire",
  COUNT: "Sayım",
  ADJUST: "Düzeltme",
};

const statusCopy: Record<StockStatus, { label: string; className: string }> = {
  out: { label: "Bitti", className: "bg-red-100 text-red-800" },
  low: { label: "Az kaldı", className: "bg-amber-100 text-amber-900" },
  ok: { label: "Yeterli", className: "bg-emerald-100 text-emerald-800" },
  off: { label: "Takip yok", className: "bg-black/5 text-[var(--muted)]" },
};

type Panel =
  | { kind: "receive" | "waste" | "count" | "track"; amount: string; note: string }
  | null;

export function StockManager() {
  const { data, error, setData } = usePoll<StockResponse>("/api/admin/stock", 4000);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<string, Panel>>({});

  const items = useMemo(() => data?.items ?? [], [data]);
  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of items) unique.set(item.categoryId, item.categoryName);
    return [...unique.entries()];
  }, [items]);

  const visible = items.filter((item) => {
    if (filter !== "all" && item.status !== filter) return false;
    if (categoryId !== "all" && item.categoryId !== categoryId) return false;
    if (query.trim() && !item.name.toLowerCase().includes(query.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  async function patch(id: string, body: Record<string, unknown>, success: string) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/admin/stock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(json.error ?? "Stok güncellenemedi.");
      return false;
    }
    setMessage(success);
    setPanels((current) => ({ ...current, [id]: null }));
    const refresh = await fetch("/api/admin/stock", {
      cache: "no-store",
      credentials: "include",
    });
    if (refresh.ok) setData(await refresh.json());
    return true;
  }

  function openPanel(id: string, kind: NonNullable<Panel>["kind"]) {
    setPanels((current) => ({
      ...current,
      [id]: { kind, amount: kind === "count" || kind === "track" ? "" : "1", note: "" },
    }));
  }

  if (!data && !error) {
    return <p className="mt-8 text-sm text-[var(--muted)]">Stoklar yükleniyor…</p>;
  }
  if (error) {
    return <p className="mt-8 text-sm text-red-700">Stok bilgileri alınamadı.</p>;
  }

  const summary = data!.summary;
  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Tümü", count: items.length },
    { id: "out", label: "Bitti", count: summary.out },
    { id: "low", label: "Az kaldı", count: summary.low },
    { id: "ok", label: "Yeterli", count: summary.ok },
    { id: "off", label: "Takip yok", count: summary.untracked },
  ];

  return (
    <div className="mt-8 space-y-6">
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Bitti" value={summary.out} tone="red" />
        <SummaryCard label="Az kaldı" value={summary.low} tone="amber" />
        <SummaryCard label="Takipte" value={summary.tracked} tone="ink" />
        <SummaryCard label="Takip yok" value={summary.untracked} tone="muted" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                filter === chip.id
                  ? "bg-[var(--ink)] text-white"
                  : "bg-black/5 text-[var(--muted)]"
              }`}
            >
              {chip.label} {chip.count}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input
            placeholder="Ürün ara"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="h-11 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="all">Tüm kategoriler</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-3">
          {visible.map((item) => {
            const panel = panels[item.id];
            const badge = statusCopy[item.status];
            return (
              <Card key={item.id} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    <div className="photo-box h-16 w-16 rounded-xl">
                      <img src={item.imageUrl} alt="" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-serif text-xl text-[var(--accent)]">
                      {item.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-serif text-2xl leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-sm text-[var(--muted)]">
                          {item.categoryName}
                          {item.available ? "" : " · menüde gizli"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {item.stockTracked ? (
                      <>
                        <div className="mt-3 flex flex-wrap items-end gap-6">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                              Kalan
                            </p>
                            <p className="font-serif text-4xl leading-none">
                              {item.stockQuantity}
                            </p>
                          </div>
                          <p className="text-sm text-[var(--muted)]">
                            Bugün {item.soldToday} satıldı
                            {item.inCarts
                              ? ` · ${item.inCarts} sepette bekliyor`
                              : ""}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id}
                            onClick={() =>
                              void patch(
                                item.id,
                                { action: "adjust", delta: 1, reason: "RECEIVE" },
                                `${item.name}: +1`,
                              )
                            }
                          >
                            +1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id}
                            onClick={() =>
                              void patch(
                                item.id,
                                { action: "adjust", delta: 5, reason: "RECEIVE" },
                                `${item.name}: +5 teslimat`,
                              )
                            }
                          >
                            +5
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id || item.stockQuantity < 1}
                            onClick={() =>
                              void patch(
                                item.id,
                                { action: "adjust", delta: -1, reason: "WASTE" },
                                `${item.name}: 1 fire`,
                              )
                            }
                          >
                            Fire 1
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openPanel(item.id, "receive")}
                          >
                            Teslimat
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openPanel(item.id, "waste")}
                          >
                            Fire
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setPanels((current) => ({
                                ...current,
                                [item.id]: {
                                  kind: "count",
                                  amount: String(item.stockQuantity),
                                  note: "",
                                },
                              }))
                            }
                          >
                            Sayım
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === item.id}
                            onClick={() =>
                              void patch(
                                item.id,
                                { action: "untrack" },
                                `${item.name} takipten çıktı.`,
                              )
                            }
                          >
                            Takibi kapat
                          </Button>
                        </div>
                        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                          Az kaldı eşiği
                          <input
                            type="number"
                            min={0}
                            className="h-8 w-16 rounded-lg border border-[var(--line)] px-2"
                            defaultValue={item.lowStockThreshold}
                            key={`${item.id}-${item.lowStockThreshold}`}
                            onBlur={(event) => {
                              const value = Math.max(0, Number(event.target.value) || 0);
                              if (value === item.lowStockThreshold) return;
                              void patch(
                                item.id,
                                { action: "threshold", lowStockThreshold: value },
                                `${item.name} eşiği ${value} oldu.`,
                              );
                            }}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="mt-3">
                        <p className="text-sm text-[var(--muted)]">
                          Siparişte adet düşmez. Kek, çorba, günlük özel gibi
                          biten ürünler için takibi aç.
                        </p>
                        <Button
                          className="mt-3"
                          size="sm"
                          onClick={() => openPanel(item.id, "track")}
                        >
                          Stok takibini aç
                        </Button>
                      </div>
                    )}

                    {panel ? (
                      <div className="mt-4 rounded-2xl bg-black/[0.03] p-3">
                        <Label>
                          {panel.kind === "receive"
                            ? "Gelen adet"
                            : panel.kind === "waste"
                              ? "Fire adedi"
                              : panel.kind === "count"
                                ? "Rafta gördüğün adet"
                                : "Başlangıç adedi"}
                        </Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="h-10 w-28"
                            value={panel.amount}
                            onChange={(event) =>
                              setPanels((current) => ({
                                ...current,
                                [item.id]: {
                                  ...panel,
                                  amount: event.target.value,
                                },
                              }))
                            }
                          />
                          <Input
                            className="h-10 min-w-40 flex-1"
                            placeholder="Not (isteğe bağlı)"
                            value={panel.note}
                            onChange={(event) =>
                              setPanels((current) => ({
                                ...current,
                                [item.id]: { ...panel, note: event.target.value },
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            disabled={busyId === item.id}
                            onClick={() => {
                              const amount = Math.max(0, Number(panel.amount) || 0);
                              if (panel.kind === "receive") {
                                void patch(
                                  item.id,
                                  {
                                    action: "adjust",
                                    delta: amount,
                                    reason: "RECEIVE",
                                    note: panel.note,
                                  },
                                  `${item.name}: ${amount} teslimat`,
                                );
                              } else if (panel.kind === "waste") {
                                void patch(
                                  item.id,
                                  {
                                    action: "adjust",
                                    delta: -amount,
                                    reason: "WASTE",
                                    note: panel.note,
                                  },
                                  `${item.name}: ${amount} fire`,
                                );
                              } else if (panel.kind === "count") {
                                void patch(
                                  item.id,
                                  {
                                    action: "set",
                                    quantity: amount,
                                    note: panel.note,
                                  },
                                  `${item.name} sayımı ${amount}`,
                                );
                              } else {
                                void patch(
                                  item.id,
                                  {
                                    action: "track",
                                    quantity: amount,
                                    threshold: 5,
                                  },
                                  `${item.name} stok takibine alındı.`,
                                );
                              }
                            }}
                          >
                            Kaydet
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPanels((current) => ({ ...current, [item.id]: null }))
                            }
                          >
                            Vazgeç
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
          {!visible.length ? (
            <Card className="p-6 text-sm text-[var(--muted)]">
              Bu filtreye uyan ürün yok. Menüden ürün ekledikten sonra burada
              takibe alabilirsin.
            </Card>
          ) : null}
        </div>

        <Card className="h-fit p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Hareketler
          </p>
          <h2 className="mt-1 font-serif text-2xl">Bugünün izi</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sipariş düşünce düşer, iptalde geri gelir. Teslimat ve fire de
            burada kalır.
          </p>
          <ul className="mt-4 space-y-3">
            {(data?.movements ?? []).map((movement) => (
              <li
                key={movement.id}
                className="border-t border-[var(--line)] pt-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{movement.menuItemName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {reasonLabel[movement.reason]}
                      {movement.actorName ? ` · ${movement.actorName}` : ""}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-medium ${
                      movement.delta < 0 ? "text-red-700" : "text-emerald-800"
                    }`}
                  >
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Kalan {movement.quantityAfter} ·{" "}
                  {new Date(movement.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
            {!data?.movements.length ? (
              <li className="text-sm text-[var(--muted)]">
                Henüz stok hareketi yok.
              </li>
            ) : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "ink" | "muted";
}) {
  const color =
    tone === "red"
      ? "text-red-800"
      : tone === "amber"
        ? "text-amber-900"
        : tone === "muted"
          ? "text-[var(--muted)]"
          : "text-[var(--ink)]";
  return (
    <Card className="p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`mt-1 font-serif text-4xl ${color}`}>{value}</p>
    </Card>
  );
}
