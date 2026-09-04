"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePoll } from "@/lib/poll";
import { PASAPAROLA_LETTERS } from "@/lib/pasaparola-shared";

type LetterState = {
  letter: string;
  clue: string;
  mine: string;
  correct: boolean;
  claimedBy: { guestId: string; name: string } | null;
};

type GameState = {
  live: boolean;
  finished: boolean;
  remainingMs: number;
  mode: "RACE" | "CLAIM" | null;
  letters: LetterState[];
  standings: { guestId: string; name: string; score: number; isMe: boolean }[];
  solutions: Record<string, string> | null;
  error?: string;
};

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function GuestPasaparola({
  guestToken,
  guestHeaders,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
}) {
  const { data, setData } = usePoll<GameState>(
    guestToken ? "/api/guest/game/pasaparola" : null,
    2000,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState("A");
  const [guess, setGuess] = useState("");
  const [left, setLeft] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setLeft(data?.remainingMs ?? 0);
  }, [data?.remainingMs]);

  useEffect(() => {
    if (!data?.live) return;
    const id = window.setInterval(() => setLeft((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.remainingMs]);

  const current = data?.letters.find((item) => item.letter === letter);

  useEffect(() => {
    setGuess(current?.mine ?? "");
  }, [letter, current?.mine]);

  useEffect(() => {
    if (!data?.live) return;
    if (data.standings.some((row) => row.isMe)) return;
    void start(data.mode === "CLAIM" ? "CLAIM" : "RACE");
  }, [data?.live, data?.mode, data?.standings]);

  async function start(mode: "RACE" | "CLAIM") {
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action: "start", mode }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState;
    setBusy(false);
    if (res.ok) setData(json);
  }

  async function submit() {
    if (!guess.trim() || !data?.live) return;
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action: "answer", letter, word: guess }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState & {
      ok?: boolean;
      error?: string;
    };
    setBusy(false);
    if (res.ok) {
      setData(json);
      setFlash(json.ok ? "Doğru" : "Yanlış");
      window.setTimeout(() => setFlash(null), 900);
      if (json.ok) {
        const next = json.letters.find(
          (item) =>
            item.letter !== letter &&
            !item.correct &&
            !item.claimedBy,
        );
        if (next) setLetter(next.letter);
      }
    } else {
      setFlash(json.error ?? "Olmadi");
      window.setTimeout(() => setFlash(null), 1200);
    }
  }

  if (!guestToken) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Masaya katılınca oyun açılır.
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Oyun yükleniyor…</p>;
  }

  const playing = data.live || data.finished;

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">Masa oyunu</p>
        <h2 className="mt-1 font-serif text-3xl">Pasaparola</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          TDK Güncel Türkçe Sözlük tanımları. Aynı masadaki herkes aynı
          kelimeleri görür. Süre 3 dakikadır.
        </p>
      </div>

      {!playing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="font-serif text-xl">Hep beraber</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Herkes kendi skorunu doldurur. Aynı ipuçları, aynı anda.
            </p>
            <Button
              className="mt-4 w-full"
              disabled={busy}
              onClick={() => void start("RACE")}
            >
              Yarışı başlat
            </Button>
          </Card>
          <Card className="p-4">
            <p className="font-serif text-xl">Kapışma</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Harfi ilk doğru bilen alır. Masa içinde tek kazanan vardır.
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              disabled={busy}
              onClick={() => void start("CLAIM")}
            >
              Kapışmayı başlat
            </Button>
          </Card>
        </div>
      ) : null}

      {playing ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="font-serif text-3xl tabular-nums">
              {data.live ? clock(left) : "Süre bitti"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {data.mode === "CLAIM" ? "Kapışma" : "Hep beraber"}
            </p>
          </div>

          {data.standings.length ? (
            <div className="flex flex-wrap gap-2">
              {data.standings.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
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

          <div className="grid grid-cols-7 gap-1.5">
            {PASAPAROLA_LETTERS.map((item) => {
              const state = data.letters.find((row) => row.letter === item);
              const mine = Boolean(state?.correct);
              const taken = Boolean(state?.claimedBy);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLetter(item)}
                  className={`min-h-10 rounded-xl text-sm font-semibold ${
                    letter === item
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : mine
                        ? "bg-emerald-100 text-emerald-900"
                        : taken
                          ? "bg-amber-100 text-amber-900"
                          : "bg-white text-[var(--ink)]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {current ? (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                {current.letter} harfi
              </p>
              <p className="mt-2 text-sm leading-relaxed">{current.clue}</p>
              {current.claimedBy && data.mode === "CLAIM" ? (
                <p className="mt-2 text-xs text-amber-800">
                  {current.claimedBy.name} aldı
                </p>
              ) : null}
              {data.live ? (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <Input
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder={`${current.letter} ile başlayan kelime`}
                    maxLength={40}
                    disabled={
                      busy ||
                      (data.mode === "CLAIM" &&
                        Boolean(current.claimedBy) &&
                        !current.correct)
                    }
                  />
                  <Button type="submit" disabled={busy}>
                    Gönder
                  </Button>
                </form>
              ) : data.solutions ? (
                <p className="mt-3 text-sm font-medium">
                  Yanıt: {data.solutions[current.letter]}
                </p>
              ) : null}
              {flash ? (
                <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                  {flash}
                </p>
              ) : null}
            </Card>
          ) : null}

          {data.finished ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button disabled={busy} onClick={() => void start("RACE")}>
                Hep beraber yeni tur
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void start("CLAIM")}
              >
                Kapışma yeni tur
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
