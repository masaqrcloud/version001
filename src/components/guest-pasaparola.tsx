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
  passed: boolean;
  claimedBy: { guestId: string; name: string } | null;
};

type GameState = {
  live: boolean;
  finished: boolean;
  remainingMs: number;
  countdownMs: number;
  startedAt: string | null;
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

function nextOpenLetter(letters: LetterState[], current: string) {
  const from = PASAPAROLA_LETTERS.indexOf(
    current as (typeof PASAPAROLA_LETTERS)[number],
  );
  const rotated = [
    ...PASAPAROLA_LETTERS.slice(from + 1),
    ...PASAPAROLA_LETTERS.slice(0, Math.max(from, 0)),
  ];
  const open = rotated.find((item) => {
    const state = letters.find((row) => row.letter === item);
    return state && !state.correct && !state.passed && !state.claimedBy;
  });
  if (open) return open;
  return (
    rotated.find((item) => {
      const state = letters.find((row) => row.letter === item);
      return state && !state.correct && !state.claimedBy;
    }) ?? current
  );
}

export function GuestPasaparola({
  guestToken,
  guestHeaders,
  onRoundLive,
}: {
  guestToken: string;
  guestHeaders: (json?: boolean) => Record<string, string>;
  onRoundLive?: () => void;
}) {
  const { data, setData } = usePoll<GameState>(
    guestToken ? "/api/guest/game/pasaparola" : null,
    1000,
    guestToken,
  );
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"RACE" | "CLAIM">("RACE");
  const [letter, setLetter] = useState("A");
  const [guess, setGuess] = useState("");
  const [left, setLeft] = useState(0);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState<"ok" | "pas" | string | null>(null);

  useEffect(() => {
    setLeft(data?.remainingMs ?? 0);
    setCount(data?.countdownMs ?? 0);
  }, [data?.remainingMs, data?.countdownMs]);

  useEffect(() => {
    if (!data?.live || count <= 0) return;
    const id = window.setInterval(() => setCount((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.startedAt, count > 0]);

  useEffect(() => {
    if (!data?.live || count > 0) return;
    const id = window.setInterval(() => setLeft((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.startedAt, count > 0]);

  useEffect(() => {
    if ((data?.countdownMs ?? 0) > 0) onRoundLive?.();
  }, [data?.countdownMs, data?.startedAt, onRoundLive]);

  useEffect(() => {
    if (data?.startedAt) setLetter("A");
  }, [data?.startedAt]);

  const current = data?.letters.find((item) => item.letter === letter);

  useEffect(() => {
    setGuess(current?.mine ?? "");
  }, [letter, current?.mine]);

  useEffect(() => {
    if (!data?.live) return;
    if (data.standings.some((row) => row.isMe)) return;
    void start(data.mode === "CLAIM" ? "CLAIM" : "RACE");
  }, [data?.live, data?.mode, data?.standings]);

  async function start(nextMode: "RACE" | "CLAIM") {
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action: "start", mode: nextMode }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState;
    setBusy(false);
    if (res.ok) {
      setLetter("A");
      setData(json);
    }
  }

  async function send(action: "answer" | "pass") {
    if (!data?.live || count > 0) return;
    if (action === "answer" && !guess.trim()) return;
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action, letter, word: guess }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState & {
      ok?: boolean;
      passed?: boolean;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setFlash(json.error ?? "Olmadı");
      window.setTimeout(() => setFlash(null), 1200);
      return;
    }
    setData(json);
    if (json.ok) {
      setFlash("ok");
      setLetter(nextOpenLetter(json.letters, letter));
      window.setTimeout(() => setFlash(null), 700);
      return;
    }
    setFlash("pas");
    window.setTimeout(() => {
      setLetter(nextOpenLetter(json.letters, letter));
      setGuess("");
      setFlash(null);
    }, 450);
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

  const counting =
    data.live && !data.finished && (count > 0 || data.letters.length === 0);
  const playing = data.live && !counting && data.letters.length > 0;
  const lobby = !data.live && !data.finished;

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

      {lobby ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("RACE")}
              className={`rounded-2xl border p-4 text-left ${
                mode === "RACE"
                  ? "border-[var(--ink)] bg-black/5"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              <p className="font-serif text-xl">Hep beraber</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Herkes kendi skorunu doldurur. Aynı ipuçları, aynı anda.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("CLAIM")}
              className={`rounded-2xl border p-4 text-left ${
                mode === "CLAIM"
                  ? "border-[var(--ink)] bg-black/5"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              <p className="font-serif text-xl">Kapışma</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Harfi ilk doğru bilen alır. Masa içinde tek kazanan vardır.
              </p>
            </button>
          </div>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => void start(mode)}
          >
            Başlat
          </Button>
        </div>
      ) : null}

      {counting ? (
        <Card className="flex flex-col items-center justify-center px-4 py-12">
          <p className="text-sm text-[var(--muted)]">Oyun başlıyor</p>
          <p className="mt-3 font-serif text-8xl tabular-nums leading-none">
            {Math.max(1, Math.ceil(count / 1000))}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {data.mode === "CLAIM" ? "Kapışma" : "Hep beraber"}
          </p>
        </Card>
      ) : null}

      {playing || data.finished ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="font-serif text-3xl tabular-nums">
              {playing ? clock(left) : "Süre bitti"}
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

          {current ? (
            <Card
              className={`p-5 text-center transition-colors ${
                flash === "pas"
                  ? "bg-red-50 ring-2 ring-red-500"
                  : flash === "ok"
                    ? "bg-emerald-50 ring-2 ring-emerald-500"
                    : ""
              }`}
            >
              <p className="font-serif text-7xl leading-none">{current.letter}</p>
              <p className="mt-4 text-sm leading-relaxed">{current.clue}</p>
              {current.claimedBy && data.mode === "CLAIM" ? (
                <p className="mt-2 text-xs text-amber-800">
                  {current.claimedBy.name} aldı
                </p>
              ) : null}
              {playing ? (
                <form
                  className="mt-5 flex flex-wrap gap-2 text-left"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send("answer");
                  }}
                >
                  <Input
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder={`${current.letter} ile başlayan kelime`}
                    maxLength={40}
                    className={flash === "pas" ? "border-red-500" : undefined}
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
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      busy ||
                      current.correct ||
                      (data.mode === "CLAIM" &&
                        Boolean(current.claimedBy) &&
                        !current.correct)
                    }
                    onClick={() => void send("pass")}
                  >
                    Pas
                  </Button>
                </form>
              ) : data.solutions ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium">
                    Yanıt: {data.solutions[current.letter]}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLetter(nextOpenLetter(data.letters, letter))
                    }
                  >
                    Sonraki harf
                  </Button>
                </div>
              ) : null}
              {flash === "ok" ? (
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  Doğru
                </p>
              ) : null}
              {flash === "pas" ? (
                <p className="mt-2 text-sm font-semibold text-red-700">Pas</p>
              ) : null}
              {flash && flash !== "ok" && flash !== "pas" ? (
                <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                  {flash}
                </p>
              ) : null}
            </Card>
          ) : null}

          {data.finished ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("RACE")}
                  className={`rounded-2xl border p-4 text-left ${
                    mode === "RACE"
                      ? "border-[var(--ink)] bg-black/5"
                      : "border-[var(--line)] bg-white"
                  }`}
                >
                  <p className="font-serif text-xl">Hep beraber</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("CLAIM")}
                  className={`rounded-2xl border p-4 text-left ${
                    mode === "CLAIM"
                      ? "border-[var(--ink)] bg-black/5"
                      : "border-[var(--line)] bg-white"
                  }`}
                >
                  <p className="font-serif text-xl">Kapışma</p>
                </button>
              </div>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => void start(mode)}
              >
                Başlat
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
