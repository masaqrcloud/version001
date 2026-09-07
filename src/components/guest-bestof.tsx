"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";

type BestOfState = {
  live: boolean;
  category: string | null;
  categoryLabel: string | null;
  categories: { id: string; label: string; count: number }[];
  pair: {
    a: { id: string; name: string };
    b: { id: string; name: string };
  } | null;
  champion: { id: string; name: string } | null;
  mine: "a" | "b" | null;
  tallies: { a: number; b: number };
  names: { a: string[]; b: string[] };
  voted: number;
  needed: number;
  tied: boolean;
  roundLabel: string;
  left: number;
  error?: string;
};

export function GuestBestOf({
  guestToken,
  guestHeaders,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
}) {
  const { data, setData } = usePoll<BestOfState>(
    guestToken ? "/api/guest/game/bestof" : null,
    1500,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("yemek");

  async function send(action: "start" | "vote" | "end", extra?: object) {
    setBusy(true);
    const res = await fetch("/api/guest/game/bestof", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action, ...extra }),
    });
    const json = (await res.json().catch(() => ({}))) as BestOfState;
    setBusy(false);
    if (res.ok) setData(json);
  }

  if (!guestToken) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Masaya katılınca kapışma açılır.
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Liste yükleniyor…</p>;
  }

  const playing = data.live && data.pair && !data.champion;
  const chips = data.categories;

  return (
    <div className="space-y-4">
      {playing && data.pair ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            {data.categoryLabel} · {data.roundLabel}
          </p>
          <Card className="p-5">
            <p className="text-sm text-[var(--muted)]">Hangisi daha iyi?</p>
            <div className="mt-4 grid gap-3">
              {(["a", "b"] as const).map((side) => {
                const picked = data.mine === side;
                const show = Boolean(data.mine);
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={busy}
                    onClick={() => void send("vote", { choice: side })}
                    className={`rounded-2xl border p-4 text-left ${
                      picked
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <p className="font-serif text-2xl leading-snug">
                      {data.pair?.[side].name}
                    </p>
                    {show ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {data.tallies[side]} oy
                        {data.names[side].length
                          ? ` · ${data.names[side].join(", ")}`
                          : ""}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              {data.tied
                ? "Eşitlik. Biri oyunu değiştirince önde olan geçer."
                : data.mine
                  ? `${data.voted}/${data.needed} oy · herkes yazınca çoğunluk diğer tura geçer.`
                  : "Oyunu ver, masanın kalanı da yazınca tur biter."}
            </p>
            <Button variant="ghost" disabled={busy} onClick={() => void send("end")}>
              Bitir
            </Button>
          </div>
        </>
      ) : (
        <>
          {data.champion ? (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                {data.categoryLabel} şampiyonu
              </p>
              <p className="mt-2 font-serif text-3xl">{data.champion.name}</p>
            </Card>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Kategori seç. Rastgele ikişer eşleşir, herkes oy verince
              çoğunluk bir üst tura çıkar.
            </p>
          )}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {chips.map((row) => {
              const active = filter === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={busy}
                  onClick={() => setFilter(row.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.label}
                  <span className="ml-1 opacity-60">{row.count}</span>
                </button>
              );
            })}
          </div>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => void send("start", { category: filter })}
          >
            {data.champion ? "Yeniden başlat" : "Başlat"}
          </Button>
        </>
      )}
    </div>
  );
}
