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
  countdownMs: number;
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
  onRoundLive,
  onImmersiveChange,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
  onRoundLive?: () => void;
  onImmersiveChange?: (on: boolean) => void;
}) {
  const { data, setData } = usePoll<MemoryState>(
    guestToken ? "/api/guest/game/memory" : null,
    700,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if ((data?.countdownMs ?? 0) > 0) onRoundLive?.();
  }, [data?.countdownMs, onRoundLive]);

  useEffect(() => {
    onImmersiveChange?.(Boolean(data?.live && !data.finished));
    return () => onImmersiveChange?.(false);
  }, [data?.live, data?.finished, onImmersiveChange]);

  useEffect(() => {
    setCount(data?.countdownMs ?? 0);
    setElapsed(data?.elapsedMs ?? 0);
  }, [data?.countdownMs, data?.elapsedMs]);

  useEffect(() => {
    if (!data?.live || data.finished || count <= 0) return;
    const id = window.setInterval(() => setCount((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.finished, count > 0]);

  useEffect(() => {
    if (!data?.live || data.finished || count > 0 || !data.elapsedMs) return;
    const id = window.setInterval(() => setElapsed((ms) => ms + 1000), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.finished, data?.elapsedMs, count > 0]);

  async function send(action: "start" | "flip" | "end", index?: number) {
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

  const counting = data.live && !data.finished && count > 0;
  const playing = data.live && !data.finished && !counting && data.tiles.length === 25;
  const myTurn =
    !counting &&
    (data.scores.length < 2 ||
      data.scores.some((row) => row.isMe && row.guestId === data.turnGuestId));
  const turnName = data.scores.find((row) => row.guestId === data.turnGuestId)?.name;

  return (
    <div className="space-y-3">
      {!playing && !counting ? (
        <div>
          <p className="page-kicker">Masa oyunu</p>
          <h2 className="mt-1 font-serif text-3xl">Hafıza</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            5×5 kart. Birden fazla kişi varsa 5 saniye, sonra sıra sıra.
            Bilemeyince sıra geçer.
          </p>
        </div>
      ) : null}

      {counting ? (
        <Card className="flex flex-col items-center justify-center px-4 py-12">
          <p className="text-sm text-[var(--muted)]">Oyun başlıyor</p>
          <p className="mt-3 font-serif text-8xl tabular-nums leading-none">
            {Math.max(1, Math.ceil(count / 1000))}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">Sıra sıra eşleştir</p>
          {data.scores.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {data.scores.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.isMe
                      ? "bg-[var(--accent)] text-white"
                      : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.name}
                </span>
              ))}
            </div>
          ) : null}
          <Button
            className="mt-6"
            variant="outline"
            disabled={busy}
            onClick={() => void send("end")}
          >
            Oyunu bitir
          </Button>
        </Card>
      ) : null}

      {playing || data.finished ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="font-serif text-2xl tabular-nums">{clock(elapsed)}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[var(--muted)]">
                {data.moves} hamle · {data.pairsLeft} kaldı
              </p>
              {playing ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void send("end")}
                >
                  Bitir
                </Button>
              ) : null}
            </div>
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
              {myTurn ? "Sıra sende" : `Sıra: ${turnName ?? "misafir"}`}
            </p>
          ) : null}

          <div className="grid grid-cols-5 gap-1.5">
            {data.tiles.map((tile, index) => {
              const open = Boolean(tile.icon);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={busy || data.finished || counting || open || !myTurn}
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
          <p className="font-serif text-2xl">
            {data.pairsLeft > 0 ? "Oyun bitti" : "Kartlar bitti"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {clock(data.elapsedMs)} · {data.moves} hamle
          </p>
        </Card>
      ) : null}

      {(!playing && !counting) || data.finished ? (
        <Button className="w-full" disabled={busy} onClick={() => void send("start")}>
          {data.finished ? "Yeniden kar" : "Başlat"}
        </Button>
      ) : null}
    </div>
  );
}
