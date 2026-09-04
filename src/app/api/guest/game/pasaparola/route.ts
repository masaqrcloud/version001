import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  PASAPAROLA_LETTERS,
  PAS_MARK,
  ROUND_MS,
  COUNTDOWN_MS,
  answersMatch,
  ensurePasaparolaWords,
  parseJsonRecord,
  scoreAnswers,
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

async function payload(guestId: string, sessionId: string) {
  const now = Date.now();
  const round = await prisma.pasaparolaRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { startedAt: "desc" },
    include: {
      plays: { include: { guest: { select: { id: true, nickname: true } } } },
    },
  });

  if (!round) {
    return {
      live: false,
      finished: false,
      remainingMs: 0,
      countdownMs: 0,
      startedAt: null,
      mode: null,
      letters: [],
      answers: {},
      claims: {},
      standings: [],
      solutions: null,
    };
  }

  const playAt = new Date(round.startedAt).getTime() + COUNTDOWN_MS;
  const countdownMs = Math.max(0, playAt - now);
  const remainingMs =
    countdownMs > 0
      ? ROUND_MS
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
    const play = round.plays.find((item) => item.guestId === id);
    if (play) claimNames[letter] = { guestId: id, name: nicknameOf(play.guest) };
  }

  const standings = round.plays
    .map((play) => ({
      guestId: play.guestId,
      name: nicknameOf(play.guest),
      score: play.score,
      isMe: play.guestId === guestId,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "tr"));

  return {
    live,
    finished,
    remainingMs,
    countdownMs,
    startedAt: round.startedAt.toISOString(),
    mode: round.mode as PasaparolaModeId,
    letters:
      countdownMs > 0
        ? []
        : wordRows.map((row) => {
            const mine = answers[row.letter] ?? "";
            const correct = answersMatch(mine, row.word);
            return {
              letter: row.letter,
              clue: row.clue,
              mine: mine === PAS_MARK ? "" : mine,
              correct,
              passed: Boolean(mine) && !correct,
              claimedBy: claimNames[row.letter] ?? null,
            };
          }),
    answers,
    claims: claimNames,
    standings,
    solutions: finished ? expected : null,
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
    action?: "start" | "answer" | "pass";
    mode?: PasaparolaModeId;
    letter?: string;
    word?: string;
  } | null;

  const now = new Date();
  const live = await prisma.pasaparolaRound.findFirst({
    where: {
      tableSessionId: guest.tableSessionId,
      endsAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
  });

  if (body?.action === "start") {
    const mode: PasaparolaModeId = body.mode === "CLAIM" ? "CLAIM" : "RACE";
    let round = live;
    if (!round) {
      const ids = await pickRoundWords();
      if (!ids) {
        return NextResponse.json(
          { error: "Kelime havuzu henüz hazır değil." },
          { status: 503 },
        );
      }
      round = await prisma.pasaparolaRound.create({
        data: {
          tableSessionId: guest.tableSessionId,
          mode,
          endsAt: new Date(now.getTime() + COUNTDOWN_MS + ROUND_MS),
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
    await prisma.pasaparolaPlay.upsert({
      where: { roundId_guestId: { roundId: round.id, guestId: guest.id } },
      update: {},
      create: { roundId: round.id, guestId: guest.id },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "answer" || body?.action === "pass") {
    if (!live) {
      return NextResponse.json({ error: "Tur bitti." }, { status: 409 });
    }
    if (Date.now() < new Date(live.startedAt).getTime() + COUNTDOWN_MS) {
      return NextResponse.json(
        { error: "Oyun henüz başlamadı." },
        { status: 409 },
      );
    }
    const letter = (body.letter ?? "").toLocaleUpperCase("tr-TR");
    if (!PASAPAROLA_LETTERS.includes(letter as (typeof PASAPAROLA_LETTERS)[number])) {
      return NextResponse.json({ error: "Harf geçersiz." }, { status: 400 });
    }
    const passing = body.action === "pass";
    const guess = passing ? PAS_MARK : (body.word ?? "").trim();
    if (!passing && !guess) {
      return NextResponse.json({ error: "Yanıt yazın." }, { status: 400 });
    }

    const play = await prisma.pasaparolaPlay.upsert({
      where: { roundId_guestId: { roundId: live.id, guestId: guest.id } },
      update: {},
      create: { roundId: live.id, guestId: guest.id },
    });

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
      } else {
        answers[letter] = passing ? PAS_MARK : guess;
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
        ? Object.values(claims).filter((id) => id === guest.id).length
        : scoreAnswers(answers, expectedMap);

    await prisma.$transaction([
      prisma.pasaparolaPlay.update({
        where: { id: play.id },
        data: { answers: JSON.stringify(answers), score },
      }),
      prisma.pasaparolaRound.update({
        where: { id: live.id },
        data: { claims: JSON.stringify(claims) },
      }),
    ]);

    return NextResponse.json({
      ok,
      passed: !ok,
      ...(await payload(guest.id, guest.tableSessionId)),
    });
  }

  return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
}
