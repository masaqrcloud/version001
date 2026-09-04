import { NextResponse } from "next/server";
import type { PasaparolaRound } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  PASAPAROLA_LETTERS,
  PAS_MARK,
  ROUND_MS,
  CLAIM_LETTER_MS,
  COUNTDOWN_MS,
  answersMatch,
  isPasGuess,
  ensurePasaparolaWords,
  parseJsonRecord,
  scoreAnswers,
  nextUnclaimedLetter,
  allPlaysClosed,
  allLettersClaimed,
  type PasaparolaModeId,
} from "@/lib/pasaparola";

function nicknameOf(guest: { nickname: string | null }) {
  const name = guest.nickname?.trim();
  if (!name || isStaffProxyNickname(name)) return "Misafir";
  return name;
}

async function pickRoundWords() {
  const byLetter = await prisma.pasaparolaWord.findMany({
    select: { id: true, letter: true },
  });
  const groups = new Map<string, string[]>();
  for (const row of byLetter) {
    const list = groups.get(row.letter) ?? [];
    list.push(row.id);
    groups.set(row.letter, list);
  }
  const ids: string[] = [];
  for (const letter of PASAPAROLA_LETTERS) {
    const list = groups.get(letter) ?? [];
    if (!list.length) return null;
    ids.push(list[Math.floor(Math.random() * list.length)]!);
  }
  return ids;
}

async function syncClaimRound(round: PasaparolaRound): Promise<PasaparolaRound> {
  if (round.mode !== "CLAIM") return round;
  const now = Date.now();
  const playAt = new Date(round.startedAt).getTime() + COUNTDOWN_MS;
  if (now < playAt) return round;
  if (new Date(round.endsAt).getTime() <= now) return round;

  const claims = parseJsonRecord(round.claims);
  let letter = round.currentLetter || "A";
  let until =
    round.letterEndsAt?.getTime() ?? playAt + CLAIM_LETTER_MS;
  let changed = false;
  let ended = false;

  for (let step = 0; step < PASAPAROLA_LETTERS.length && now >= until; step += 1) {
    const next = nextUnclaimedLetter(claims, letter);
    if (!next) {
      ended = true;
      changed = true;
      break;
    }
    letter = next;
    until += CLAIM_LETTER_MS;
    changed = true;
  }

  if (!changed) return round;
  return prisma.pasaparolaRound.update({
    where: { id: round.id },
    data: ended
      ? { endsAt: new Date(now), currentLetter: letter, letterEndsAt: new Date(now) }
      : { currentLetter: letter, letterEndsAt: new Date(until) },
  });
}

async function payload(guestId: string, sessionId: string) {
  const now = Date.now();
  let round = await prisma.pasaparolaRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { startedAt: "desc" },
    include: {
      plays: { include: { guest: { select: { id: true, nickname: true } } } },
    },
  });

  if (round) {
    const synced = await syncClaimRound(round);
    if (synced.id === round.id && synced !== round) {
      round = await prisma.pasaparolaRound.findUniqueOrThrow({
        where: { id: round.id },
        include: {
          plays: { include: { guest: { select: { id: true, nickname: true } } } },
        },
      });
    }
  }

  if (!round) {
    return {
      live: false,
      finished: false,
      remainingMs: 0,
      countdownMs: 0,
      letterMs: 0,
      currentLetter: "A",
      startedAt: null,
      mode: null,
      letters: [],
      answers: {},
      claims: {},
      standings: [],
      solutions: null,
      left: false,
    };
  }

  const playAt = new Date(round.startedAt).getTime() + COUNTDOWN_MS;
  const countdownMs = Math.max(0, playAt - now);
  if (
    countdownMs === 0 &&
    new Date(round.endsAt).getTime() > now &&
    (round.mode === "CLAIM"
      ? allLettersClaimed(parseJsonRecord(round.claims))
      : allPlaysClosed(round.plays))
  ) {
    const ended = await prisma.pasaparolaRound.update({
      where: { id: round.id },
      data: { endsAt: new Date(now), letterEndsAt: new Date(now) },
    });
    round = { ...round, ...ended };
  }
  const claimLetterMs = Math.max(
    0,
    (round.letterEndsAt?.getTime() ?? playAt + CLAIM_LETTER_MS) - now,
  );
  const remainingMs =
    countdownMs > 0
      ? round.mode === "CLAIM"
        ? CLAIM_LETTER_MS
        : ROUND_MS
      : round.mode === "CLAIM"
        ? claimLetterMs
        : Math.max(0, new Date(round.endsAt).getTime() - now);
  const finished = countdownMs === 0 && remainingMs === 0;
  const live = !finished;
  const wordRows = await prisma.pasaparolaWord.findMany({
    where: { id: { in: round.wordIds.split(",") } },
  });
  const order = new Map(round.wordIds.split(",").map((id, index) => [id, index]));
  wordRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const expected: Record<string, string> = {};
  for (const row of wordRows) expected[row.letter] = row.word;

  const mine = round.plays.find((play) => play.guestId === guestId);
  const answers = parseJsonRecord(mine?.answers);
  const claims = parseJsonRecord(round.claims);
  const claimNames: Record<string, { guestId: string; name: string }> = {};
  for (const [letter, id] of Object.entries(claims)) {
    if (!PASAPAROLA_LETTERS.includes(letter as (typeof PASAPAROLA_LETTERS)[number])) {
      continue;
    }
    const play = round.plays.find((item) => item.guestId === id);
    if (play) claimNames[letter] = { guestId: id, name: nicknameOf(play.guest) };
  }

  const standings = round.plays
    .map((play) => ({
      guestId: play.guestId,
      name: nicknameOf(play.guest),
      score: play.score,
      isMe: play.guestId === guestId,
      left: Boolean(play.leftAt),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "tr"));

  return {
    live,
    finished,
    left: Boolean(mine?.leftAt),
    remainingMs,
    countdownMs,
    letterMs: round.mode === "CLAIM" ? remainingMs : 0,
    currentLetter: round.currentLetter,
    startedAt: round.startedAt.toISOString(),
    mode: round.mode as PasaparolaModeId,
    letters:
      countdownMs > 0
        ? []
        : wordRows.map((row) => {
            const mine = answers[row.letter] ?? "";
            const correct = answersMatch(mine, row.word);
            const passed = mine === PAS_MARK;
            return {
              letter: row.letter,
              clue: row.clue,
              mine: passed ? "" : mine,
              correct,
              passed,
              wrong: Boolean(mine) && !correct && !passed,
              claimedBy: claimNames[row.letter] ?? null,
            };
          }),
    answers,
    claims: claimNames,
    standings,
    solutions: finished
      ? Object.fromEntries(wordRows.map((row) => [row.letter, row.word]))
      : null,
  };
}

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  await ensurePasaparolaWords();
  return NextResponse.json(await payload(guest.id, guest.tableSessionId));
}

export async function POST(request: Request) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  await ensurePasaparolaWords();

  const body = (await request.json().catch(() => null)) as {
    action?: "start" | "answer" | "pass" | "end";
    mode?: PasaparolaModeId;
    letter?: string;
    word?: string;
  } | null;

  const now = new Date();
  let live = await prisma.pasaparolaRound.findFirst({
    where: {
      tableSessionId: guest.tableSessionId,
      endsAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
  });
  if (live) live = await syncClaimRound(live);

  if (body?.action === "start") {
    const mode: PasaparolaModeId = body.mode === "CLAIM" ? "CLAIM" : "RACE";
    let round = live && new Date(live.endsAt).getTime() > Date.now() ? live : null;
    if (!round) {
      const ids = await pickRoundWords();
      if (!ids) {
        return NextResponse.json(
          { error: "Kelime havuzu henüz hazır değil." },
          { status: 503 },
        );
      }
      const playAt = now.getTime() + COUNTDOWN_MS;
      round = await prisma.pasaparolaRound.create({
        data: {
          tableSessionId: guest.tableSessionId,
          mode,
          endsAt: new Date(
            playAt +
              (mode === "CLAIM"
                ? PASAPAROLA_LETTERS.length * CLAIM_LETTER_MS
                : ROUND_MS),
          ),
          currentLetter: "A",
          letterEndsAt: new Date(playAt + CLAIM_LETTER_MS),
          wordIds: ids.join(","),
        },
      });
      const who = nicknameOf(guest);
      const modeLabel = mode === "CLAIM" ? "Kapışma" : "Hep beraber";
      await notifyTableGuests(
        guest.tableSessionId,
        "Pasaparola",
        `${who} ${modeLabel} turunu başlattı. 5 saniye.`,
        guest.id,
      );
    }
    const existing = await prisma.pasaparolaPlay.findUnique({
      where: { roundId_guestId: { roundId: round.id, guestId: guest.id } },
    });
    if (!existing?.leftAt) {
      await prisma.pasaparolaPlay.upsert({
        where: { roundId_guestId: { roundId: round.id, guestId: guest.id } },
        update: {},
        create: { roundId: round.id, guestId: guest.id },
      });
    }
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "end") {
    if (!live || new Date(live.endsAt).getTime() <= Date.now()) {
      return NextResponse.json(await payload(guest.id, guest.tableSessionId));
    }
    await prisma.pasaparolaPlay.upsert({
      where: { roundId_guestId: { roundId: live.id, guestId: guest.id } },
      update: { leftAt: now },
      create: { roundId: live.id, guestId: guest.id, leftAt: now },
    });
    const plays = await prisma.pasaparolaPlay.findMany({
      where: { roundId: live.id },
    });
    if (allPlaysClosed(plays)) {
      await prisma.pasaparolaRound.update({
        where: { id: live.id },
        data: { endsAt: now, letterEndsAt: now },
      });
    }
    await notifyTableGuests(
      guest.tableSessionId,
      "Pasaparola",
      `${nicknameOf(guest)} oyundan çıktı.`,
      guest.id,
    );
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "answer" || body?.action === "pass") {
    if (!live || new Date(live.endsAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Tur bitti." }, { status: 409 });
    }
    if (Date.now() < new Date(live.startedAt).getTime() + COUNTDOWN_MS) {
      return NextResponse.json(
        { error: "Oyun henüz başlamadı." },
        { status: 409 },
      );
    }
    if (live.mode === "CLAIM" && body.action === "pass") {
      return NextResponse.json({ error: "Kapışmada pas yok." }, { status: 400 });
    }
    const typedPas = isPasGuess(body.word ?? "");
    const passing = live.mode !== "CLAIM" && (body.action === "pass" || typedPas);
    const letter = (
      live.mode === "CLAIM" ? live.currentLetter : (body.letter ?? "")
    ).toLocaleUpperCase("tr-TR");
    if (!PASAPAROLA_LETTERS.includes(letter as (typeof PASAPAROLA_LETTERS)[number])) {
      return NextResponse.json({ error: "Harf geçersiz." }, { status: 400 });
    }
    const guess = passing ? PAS_MARK : (body.word ?? "").trim();
    if (!passing && !guess) {
      return NextResponse.json({ error: "Yanıt yazın." }, { status: 400 });
    }

    const play = await prisma.pasaparolaPlay.upsert({
      where: { roundId_guestId: { roundId: live.id, guestId: guest.id } },
      update: {},
      create: { roundId: live.id, guestId: guest.id },
    });
    if (play.leftAt) {
      return NextResponse.json({ error: "Oyundan çıktın." }, { status: 409 });
    }

    const ids = live.wordIds.split(",");
    const words = await prisma.pasaparolaWord.findMany({
      where: { id: { in: ids } },
    });
    const expected = words.find((row) => row.letter === letter);
    if (!expected) {
      return NextResponse.json({ error: "Harf yok." }, { status: 400 });
    }

    const ok = !passing && answersMatch(guess, expected.word);
    const answers = parseJsonRecord(play.answers);
    const claims = parseJsonRecord(live.claims);
    let currentLetter = live.currentLetter;
    let letterEndsAt = live.letterEndsAt;

    if (live.mode === "CLAIM") {
      if (claims[letter] && claims[letter] !== guest.id) {
        return NextResponse.json(
          { error: "Bu harfi başka misafir aldı." },
          { status: 409 },
        );
      }
      if (ok) {
        answers[letter] = expected.word;
        claims[letter] = guest.id;
        const next = nextUnclaimedLetter(claims, letter);
        if (next) {
          currentLetter = next;
          letterEndsAt = new Date(Date.now() + CLAIM_LETTER_MS);
        } else {
          letterEndsAt = now;
        }
      }
    } else if (ok) {
      answers[letter] = expected.word;
    } else {
      answers[letter] = passing ? PAS_MARK : guess;
    }

    const expectedMap: Record<string, string> = {};
    for (const row of words) expectedMap[row.letter] = row.word;
    const score =
      live.mode === "CLAIM"
        ? Object.entries(claims).filter(
            ([key, id]) =>
              id === guest.id &&
              PASAPAROLA_LETTERS.includes(key as (typeof PASAPAROLA_LETTERS)[number]),
          ).length
        : scoreAnswers(answers, expectedMap);

    const claimEnded =
      live.mode === "CLAIM" &&
      letterEndsAt &&
      letterEndsAt.getTime() <= Date.now();
    const plays = await prisma.pasaparolaPlay.findMany({
      where: { roundId: live.id },
    });
    const roundOver =
      live.mode === "CLAIM"
        ? allLettersClaimed(claims) || Boolean(claimEnded)
        : allPlaysClosed(
            plays.map((row) =>
              row.guestId === guest.id
                ? { ...row, answers: JSON.stringify(answers) }
                : row,
            ),
          );

    await prisma.$transaction([
      prisma.pasaparolaPlay.update({
        where: { id: play.id },
        data: { answers: JSON.stringify(answers), score },
      }),
      prisma.pasaparolaRound.update({
        where: { id: live.id },
        data: {
          claims: JSON.stringify(claims),
          currentLetter,
          letterEndsAt,
          ...(roundOver ? { endsAt: now } : {}),
        },
      }),
    ]);

    return NextResponse.json({
      ok,
      passed: passing,
      wrong: !ok && !passing,
      ...(await payload(guest.id, guest.tableSessionId)),
    });
  }

  return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
}
