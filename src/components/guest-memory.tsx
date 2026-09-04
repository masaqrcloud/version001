"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";

type MemoryState = {
  live: boolean;
  finished: boolean;
  tiles: {
    icon: string | null;
    joker: boolean;
    matched: boolean;
    mine: boolean;
    faceUp: boolean;
  }[];
  scores: { guestId: string; name: string; score: number; isMe: boolean }[];
  turnGuestId: string | null;
  isMyTurn: boolean;
  elapsedMs: number;
  moves: number;
  pairsLeft: number;
};

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GuestMemory({
  guestToken,
  guestHeaders,
  onImmersiveChange,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
  onImmersiveChange?: (on: boolean) => void;
}) {
  const { data, setData } = usePoll<MemoryState>(
    guestToken ? "/api/guest/game/memory" : null,
    700,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    onImmersiveChange?.(Boolean(data?.live && !data.finished));
    return () => onImmersiveChange?.(false);
  }, [data?.live, data?.finished, onImmersiveChange]);

  useEffect(() => {
    setElapsed(data?.elapsedMs ?? 0);
    if (!data?.live || data.finished || !data.elapsedMs) return;
    const id = window.setInterval(() => setElapsed((ms) => ms + 1000), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.finished, data?.elapsedMs]);

  async function send(action: "start" | "flip", index?: number) {
    setBusy(true);
    const res = await fetch("/api/guest/game/memory", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action, index }),
    });
    const json = (await res.json().catch(() => ({}))) as MemoryState;
    setBusy(false);
    if (res.ok) setData(json);
  }

  if (!guestToken) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Masaya katılınca oyun açılır.
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Kartlar karılıyor…</p>;
  }

  const playing = data.live && data.tiles.length === 25;
  const turnName = data.scores.find((row) => row.guestId === data.turnGuestId)?.name;

  return (
    <div className="space-y-3">
      {!playing ? (
        <div>
          <p className="page-kicker">Masa oyunu</p>
          <h2 className="mt-1 font-serif text-3xl">Hafıza</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            5×5 kart. 12 çift + 1 joker. Tek başına süreye karşı; masada sıra
            sende, kim daha çok eşleştirirse o kazanır.
          </p>
        </div>
      ) : null}

      {playing || data.finished ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-serif text-2xl tabular-nums">{clock(elapsed)}</p>
            <p className="text-xs text-[var(--muted)]">
              {data.moves} hamle · {data.pairsLeft} kaldı
            </p>
          </div>
          {data.scores.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.scores.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.isMe
                      ? "bg-[var(--accent)] text-white"
                      : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.name} · {row.score}
                </span>
              ))}
            </div>
          ) : null}
          {playing && data.scores.length > 1 ? (
            <p className="text-xs text-[var(--muted)]">
              {data.isMyTurn ? "Sıra sende" : `Sıra: ${turnName ?? "misafir"}`}
            </p>
          ) : null}

          <div className="grid grid-cols-5 gap-1.5">
            {data.tiles.map((tile, index) => {
              const open = Boolean(tile.icon);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={busy || data.finished || open || !data.isMyTurn}
                  onClick={() => void send("flip", index)}
                  className={`aspect-square rounded-xl text-lg leading-none transition-colors ${
                    tile.matched
                      ? tile.mine
                        ? "bg-emerald-100"
                        : "bg-amber-50"
                      : open
                        ? "bg-white ring-1 ring-[var(--ink)]"
                        : "bg-[var(--ink)] text-[var(--bg)]"
                  }`}
                >
                  {open ? (
                    <span className="block translate-y-px">{tile.icon}</span>
                  ) : (
                    <span className="text-[10px] font-semibold opacity-70">?</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {data.finished ? (
        <Card className="p-4 text-center">
          <p className="font-serif text-2xl">Kartlar bitti</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {clock(data.elapsedMs)} · {data.moves} hamle
          </p>
        </Card>
      ) : null}

      {!playing || data.finished ? (
        <Button className="w-full" disabled={busy} onClick={() => void send("start")}>
          {data.finished ? "Yeniden kar" : "Başlat"}
        </Button>
      ) : null}
    </div>
  );
}
