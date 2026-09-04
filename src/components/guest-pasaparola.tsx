"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePoll } from "@/lib/poll";
import { PASAPAROLA_LETTERS, isPasGuess } from "@/lib/pasaparola-shared";

type LetterState = {
  letter: string;
  clue: string;
  mine: string;
  correct: boolean;
  passed: boolean;
  wrong: boolean;
  claimedBy: { guestId: string; name: string } | null;
};

type GameState = {
  live: boolean;
  finished: boolean;
  remainingMs: number;
  countdownMs: number;
  letterMs: number;
  currentLetter: string;
  startedAt: string | null;
  mode: "RACE" | "CLAIM" | null;
  letters: LetterState[];
  standings: {
    guestId: string;
    name: string;
    score: number;
    isMe: boolean;
    left?: boolean;
  }[];
  solutions: Record<string, string> | null;
  left?: boolean;
  error?: string;
};

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
        <path
          fill="currentColor"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
        />
      </svg>
    </span>
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z"
        />
      </svg>
    </span>
  );
}

function nextOpenLetter(letters: LetterState[], current: string) {
  const from = PASAPAROLA_LETTERS.indexOf(
    current as (typeof PASAPAROLA_LETTERS)[number],
  );
  const rotated = [
    ...PASAPAROLA_LETTERS.slice(from + 1),
    ...PASAPAROLA_LETTERS.slice(0, Math.max(from, 0)),
  ];
  const pick = (wantPassed: boolean) =>
    rotated.find((item) => {
      const state = letters.find((row) => row.letter === item);
      if (!state || state.correct || state.wrong || state.claimedBy) return false;
      return wantPassed ? state.passed : !state.passed;
    });
  return pick(false) ?? pick(true) ?? current;
}

export function GuestPasaparola({
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
  const [flash, setFlash] = useState<"ok" | "wrong" | string | null>(null);
  const [endTab, setEndTab] = useState<"skor" | "cevaplar">("cevaplar");

  useEffect(() => {
    const ms =
      data?.mode === "CLAIM" ? (data.letterMs ?? data.remainingMs) : data?.remainingMs;
    setLeft(ms ?? 0);
    setCount(data?.countdownMs ?? 0);
  }, [data?.remainingMs, data?.letterMs, data?.countdownMs, data?.mode]);

  useEffect(() => {
    if (!data?.live || count <= 0) return;
    const id = window.setInterval(() => setCount((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.startedAt, count > 0]);

  useEffect(() => {
    if (!data?.live || count > 0) return;
    const id = window.setInterval(() => setLeft((ms) => Math.max(0, ms - 1000)), 1000);
    return () => window.clearInterval(id);
  }, [data?.live, data?.startedAt, data?.currentLetter, count > 0]);

  useEffect(() => {
    if ((data?.countdownMs ?? 0) > 0) onRoundLive?.();
  }, [data?.countdownMs, data?.startedAt, onRoundLive]);

  useEffect(() => {
    onImmersiveChange?.(Boolean(data?.live && !data.finished && !data.left));
    return () => onImmersiveChange?.(false);
  }, [data?.live, data?.finished, data?.left, onImmersiveChange]);

  useEffect(() => {
    if (data?.startedAt) setLetter("A");
  }, [data?.startedAt]);

  useEffect(() => {
    if (data?.mode === "CLAIM" && data.currentLetter) {
      setLetter(data.currentLetter);
      setGuess("");
    }
  }, [data?.mode, data?.currentLetter]);

  const current = data?.letters.find((item) => item.letter === letter);

  useEffect(() => {
    if (data?.mode === "CLAIM") return;
    setGuess(current?.mine ?? "");
  }, [letter, current?.mine, data?.mode]);

  useEffect(() => {
    if (!data?.live || data.left) return;
    if (data.standings.some((row) => row.isMe)) return;
    void start(data.mode === "CLAIM" ? "CLAIM" : "RACE");
  }, [data?.live, data?.left, data?.mode, data?.standings]);

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
      setLetter(json.currentLetter || "A");
      setEndTab("cevaplar");
      setData(json);
    }
  }

  async function stop() {
    if (!data?.live) return;
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action: "end" }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState;
    setBusy(false);
    if (res.ok) {
      setData(json);
    }
  }

  async function send(action: "answer" | "pass") {
    if (!data?.live || count > 0) return;
    if (data.mode === "CLAIM" && action === "pass") return;
    const passing =
      data.mode !== "CLAIM" && (action === "pass" || isPasGuess(guess));
    if (!passing && !guess.trim()) return;
    setBusy(true);
    const res = await fetch("/api/guest/game/pasaparola", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({
        action: passing ? "pass" : "answer",
        letter,
        word: guess,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as GameState & {
      ok?: boolean;
      passed?: boolean;
      wrong?: boolean;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setFlash(json.error ?? "Olmadı");
      window.setTimeout(() => setFlash(null), 1200);
      return;
    }
    setData(json);
    const next =
      json.mode === "CLAIM"
        ? json.currentLetter
        : nextOpenLetter(json.letters, letter);
    if (json.ok) {
      setFlash("ok");
      setLetter(next);
      setGuess("");
      window.setTimeout(() => setFlash(null), 700);
      return;
    }
    if (passing || json.passed) {
      setLetter(next);
      setGuess("");
      setFlash(null);
      return;
    }
    setFlash("wrong");
    window.setTimeout(() => {
      if (json.mode !== "CLAIM") setLetter(next);
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

  const leftRound = Boolean(data.left);
  const counting =
    data.live &&
    !data.finished &&
    !leftRound &&
    (count > 0 || data.letters.length === 0);
  const playing =
    data.live && !data.finished && !leftRound && !counting && data.letters.length > 0;
  const mineDone =
    data.mode === "RACE" &&
    data.letters.length > 0 &&
    data.letters.every((row) => row.correct || row.wrong);
  const lobby = !data.live && !data.finished;
  const sittingOut = data.live && !data.finished && leftRound;

  return (
    <div className="space-y-4">
      {!playing && !counting ? (
        <div>
          <p className="page-kicker">Masa oyunu</p>
          <h2 className="mt-1 font-serif text-3xl">Pasaparola</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Hep beraber 5 dakika; kapışmada her harf 20 saniye. Bitir dersen sen
            çıkarsın, masa oynamaya devam eder.
          </p>
        </div>
      ) : null}

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
                5 dakika. Herkes harflerini bitirince oyun kapanır.
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
                Aynı harf, 20 saniye. İlk doğru bilen alır.
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

      {sittingOut ? (
        <Card className="p-5 text-center">
          <p className="font-serif text-2xl">Oyundan çıktın</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Masa oynamaya devam ediyor. Tur bitince cevaplar açılır.
          </p>
          {data.standings.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {data.standings.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    row.left
                      ? "bg-black/5 text-[var(--muted)] line-through"
                      : row.isMe
                        ? "bg-[var(--accent)] text-white"
                        : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.name} · {row.left ? "çıktı" : row.score}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {counting ? (
        <Card className="flex flex-col items-center justify-center px-4 py-12">
          <p className="text-sm text-[var(--muted)]">Oyun başlıyor</p>
          <p className="mt-3 font-serif text-8xl tabular-nums leading-none">
            {Math.max(1, Math.ceil(count / 1000))}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {data.mode === "CLAIM" ? "Kapışma · 20 sn" : "Hep beraber · 5 dk"}
          </p>
          <Button
            className="mt-6"
            variant="outline"
            disabled={busy}
            onClick={() => void stop()}
          >
            Oyunu bitir
          </Button>
        </Card>
      ) : null}

      {playing ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="font-serif text-3xl tabular-nums">{clock(left)}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--muted)]">
                {data.mode === "CLAIM" ? "Kapışma" : "Hep beraber"}
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void stop()}
              >
                Bitir
              </Button>
            </div>
          </div>

          {data.standings.length ? (
            <div className="flex flex-wrap gap-2">
              {data.standings.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    row.left
                      ? "bg-black/5 text-[var(--muted)] line-through"
                      : row.isMe
                        ? "bg-[var(--accent)] text-white"
                        : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.name} · {row.left ? "çıktı" : row.score}
                </span>
              ))}
            </div>
          ) : null}

          {playing && mineDone ? (
            <Card className="p-5 text-center">
              <p className="font-serif text-2xl">Sen bitirdin</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Masadakiler de bitince oyun kapanacak.
              </p>
            </Card>
          ) : current ? (
            <Card
              className={`p-5 text-center transition-colors ${
                flash === "wrong"
                  ? "bg-red-50 ring-2 ring-red-500"
                  : flash === "ok"
                    ? "bg-emerald-50 ring-2 ring-emerald-500"
                    : ""
              }`}
            >
              <p className="font-serif text-[7rem] leading-none">{current.letter}</p>
              <p className="mt-4 text-sm leading-relaxed">{current.clue}</p>
              {current.claimedBy && data.mode === "CLAIM" ? (
                <p className="mt-2 text-xs text-amber-800">
                  {current.claimedBy.name} aldı
                </p>
              ) : null}
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
                  placeholder={
                    data.mode === "CLAIM"
                      ? `${current.letter} ile başlayan kelime`
                      : `${current.letter} ile başlayan kelime veya pas`
                  }
                  maxLength={40}
                  className={flash === "wrong" ? "border-red-500" : undefined}
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
                {data.mode === "RACE" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || current.correct}
                    onClick={() => void send("pass")}
                  >
                    Pas
                  </Button>
                ) : null}
              </form>
              {flash === "ok" ? (
                <p className="mt-2 text-sm font-semibold text-emerald-800">
                  Doğru
                </p>
              ) : null}
              {flash === "wrong" ? (
                <p className="mt-2 text-sm font-semibold text-red-700">Yanlış</p>
              ) : null}
              {flash && flash !== "ok" && flash !== "wrong" ? (
                <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                  {flash}
                </p>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      {data.finished ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-serif text-2xl">Oyun bitti</p>
            <p className="text-sm text-[var(--muted)]">
              {data.mode === "CLAIM" ? "Kapışma" : "Hep beraber"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-black/5 p-1">
            <button
              type="button"
              className={`rounded-full py-2 text-sm font-medium ${
                endTab === "cevaplar"
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : ""
              }`}
              onClick={() => setEndTab("cevaplar")}
            >
              Cevaplar
            </button>
            <button
              type="button"
              className={`rounded-full py-2 text-sm font-medium ${
                endTab === "skor" ? "bg-[var(--ink)] text-[var(--bg)]" : ""
              }`}
              onClick={() => setEndTab("skor")}
            >
              Skor
            </button>
          </div>

          {endTab === "skor" ? (
            <div className="flex flex-wrap gap-2">
              {data.standings.map((row) => (
                <span
                  key={row.guestId}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    row.left
                      ? "bg-black/5 text-[var(--muted)] line-through"
                      : row.isMe
                        ? "bg-[var(--accent)] text-white"
                        : "bg-black/5 text-[var(--ink)]"
                  }`}
                >
                  {row.name} · {row.left ? "çıktı" : row.score}
                </span>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              {data.letters.map((item, index) => {
                const answer = data.solutions?.[item.letter] ?? "—";
                const ok =
                  data.mode === "CLAIM" ? Boolean(item.claimedBy) : item.correct;
                return (
                  <div
                    key={item.letter}
                    className={`flex gap-3 px-4 py-3 ${
                      index ? "border-t border-[var(--line)]" : ""
                    } ${
                      ok
                        ? "bg-emerald-50/80"
                        : "bg-red-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-2 pt-0.5">
                      <span
                        className={`font-serif text-xl leading-none ${
                          ok ? "text-emerald-800" : "text-red-800"
                        }`}
                      >
                        {item.letter}
                      </span>
                      <Mark ok={ok} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-[var(--muted)]">
                        {item.clue}
                      </p>
                      <p
                        className={`mt-1 text-base font-semibold ${
                          ok ? "text-emerald-900" : "text-red-900"
                        }`}
                      >
                        {answer}
                      </p>
                      {ok && item.claimedBy ? (
                        <p className="mt-0.5 text-xs font-medium text-emerald-800">
                          {item.claimedBy.name} bildi
                        </p>
                      ) : null}
                      {!ok && item.wrong && item.mine ? (
                        <p className="mt-0.5 text-xs text-red-700">
                          Senin: {item.mine}
                        </p>
                      ) : null}
                      {!ok && item.passed ? (
                        <p className="mt-0.5 text-xs text-red-700">Pas</p>
                      ) : null}
                      {!ok && data.mode === "CLAIM" && !item.claimedBy ? (
                        <p className="mt-0.5 text-xs text-red-700">
                          Kimse bilemedi
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
    </div>
  );
}
