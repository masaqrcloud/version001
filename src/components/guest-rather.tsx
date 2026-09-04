"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";

type RatherState = {
  live: boolean;
  category: string;
  categories: { id: string; label: string; count: number }[];
  question: {
    id: string;
    category: string;
    categoryLabel: string;
    a: string;
    b: string;
  } | null;
  mine: "a" | "b" | null;
  tallies: { a: number; b: number };
  names: { a: string[]; b: string[] };
  remaining: number;
  error?: string;
};

export function GuestRather({
  guestToken,
  guestHeaders,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
}) {
  const { data, setData } = usePoll<RatherState>(
    guestToken ? "/api/guest/game/rather" : null,
    1500,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("ALL");

  async function send(action: "start" | "vote" | "next", extra?: object) {
    setBusy(true);
    const res = await fetch("/api/guest/game/rather", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action, ...extra }),
    });
    const json = (await res.json().catch(() => ({}))) as RatherState;
    setBusy(false);
    if (res.ok) setData(json);
  }

  if (!guestToken) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Masaya katılınca sorular açılır.
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Sorular yükleniyor…</p>;
  }

  const playing = data.live && data.question;
  const chips = data.categories;

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">Masa oyunu</p>
        <h2 className="mt-1 font-serif text-3xl">Cevap Ver</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Would you rather. Aynı soru masaya düşer, herkes bir taraf seçer.
          Kategoriye sıkıştırmak istersen yukarıdan seç.
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((row) => {
          const active = (playing ? data.category : filter) === row.id;
          return (
            <button
              key={row.id}
              type="button"
              disabled={busy}
              onClick={() => {
                setFilter(row.id);
                if (playing) void send("next", { category: row.id });
              }}
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

      {playing && data.question ? (
        <>
          <Card className="relative p-5 pt-8">
            <p className="absolute right-4 top-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              {data.question.categoryLabel}
            </p>
            <p className="text-sm text-[var(--muted)]">Hangisini seçerdin?</p>
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
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      picked
                        ? "border-emerald-600 bg-emerald-50"
                        : show
                          ? "border-[var(--line)] bg-white"
                          : "border-[var(--line)] bg-white hover:border-[var(--ink)]"
                    }`}
                  >
                    <p className="font-serif text-xl leading-snug">
                      {data.question?.[side]}
                    </p>
                    {show ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {data.tallies[side]} kişi
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
            <p className="text-xs text-[var(--muted)]">
              {data.remaining} soru kaldı
            </p>
            <Button
              disabled={busy}
              onClick={() => void send("next", { category: data.category })}
            >
              Sonraki soru
            </Button>
          </div>
        </>
      ) : (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void send("start", { category: filter })}
        >
          Başlat
        </Button>
      )}
    </div>
  );
}
