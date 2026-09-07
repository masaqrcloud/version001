"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";

type TenTenState = {
  live: boolean;
  prompt: { id: string; text: string } | null;
  mine: number | null;
  average: number | null;
  count: number;
  ratings: { name: string; score: number; isMe: boolean }[];
  remaining: number;
  error?: string;
};

export function GuestTenTen({
  guestToken,
  guestHeaders,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
}) {
  const { data, setData } = usePoll<TenTenState>(
    guestToken ? "/api/guest/game/tenten" : null,
    1500,
    guestToken,
  );
  const [busy, setBusy] = useState(false);

  async function send(action: "start" | "rate" | "next", extra?: object) {
    setBusy(true);
    const res = await fetch("/api/guest/game/tenten", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action, ...extra }),
    });
    const json = (await res.json().catch(() => ({}))) as TenTenState;
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

  const playing = data.live && data.prompt;
  const revealed = data.mine != null;

  return (
    <div className="space-y-4">
      {playing && data.prompt ? (
        <>
          <Card className="p-5">
            <p className="text-sm text-[var(--muted)]">Kaç verirsin?</p>
            <p className="mt-2 font-serif text-2xl leading-snug">{data.prompt.text}</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const picked = data.mine === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={busy}
                    onClick={() => void send("rate", { score: n })}
                    className={`rounded-xl border py-2.5 text-sm font-semibold ${
                      picked
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-[var(--line)] bg-white text-[var(--ink)]"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </Card>

          {revealed ? (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                Cevaplar
              </p>
              <p className="mt-2 font-serif text-3xl">
                {data.average ?? "—"}
                <span className="ml-2 text-base font-sans text-[var(--muted)]">
                  masa ortalaması
                </span>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{data.count} kişi puan verdi</p>
              <ul className="mt-4 space-y-2">
                {data.ratings.map((row, index) => (
                  <li
                    key={`${row.name}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {row.name}
                      {row.isMe ? " (sen)" : ""}
                    </span>
                    <span className="font-semibold">{row.score}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Puan verince masanın cevapları açılır.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">{data.remaining} soru kaldı</p>
            <Button disabled={busy} onClick={() => void send("next")}>
              Sonraki soru
            </Button>
          </div>
        </>
      ) : (
        <Button className="w-full" disabled={busy} onClick={() => void send("start")}>
          Başlat
        </Button>
      )}
    </div>
  );
}
