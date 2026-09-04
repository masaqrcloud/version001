import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  JOKER_PAIR,
  MEMORY_HIDE_MS,
  MEMORY_SIZE,
  dealMemoryBoard,
  parseJson,
  type MemoryTile,
} from "@/lib/memory";

function nicknameOf(guest: { nickname: string | null }) {
  const name = guest.nickname?.trim();
  if (!name || isStaffProxyNickname(name)) return "Misafir";
  return name;
}

type RoundRow = {
  id: string;
  tiles: string;
  faceUp: string;
  matched: string;
  players: string;
  turnGuestId: string | null;
  scores: string;
  hideAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  moves: number;
};

async function syncRound(round: RoundRow): Promise<RoundRow> {
  if (round.endedAt) return round;
  if (!round.hideAt || round.hideAt.getTime() > Date.now()) return round;
  const players = parseJson<string[]>(round.players, []);
  const faceUp = parseJson<number[]>(round.faceUp, []);
  const turn =
    faceUp.length === 2 && players.length > 1
      ? nextPlayer(players, round.turnGuestId)
      : round.turnGuestId;
  return prisma.memoryRound.update({
    where: { id: round.id },
    data: { faceUp: "[]", hideAt: null, turnGuestId: turn },
  });
}

function nextPlayer(players: string[], current: string | null) {
  if (!players.length) return current;
  const from = current ? players.indexOf(current) : -1;
  return players[(from + 1) % players.length] ?? players[0] ?? current;
}

async function payload(guestId: string, sessionId: string) {
  let round = await prisma.memoryRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });
  if (round) round = await syncRound(round);
  if (!round) {
    return {
      live: false,
      finished: false,
      tiles: [],
      scores: [],
      turnGuestId: null,
      isMyTurn: true,
      elapsedMs: 0,
      moves: 0,
      pairsLeft: 13,
    };
  }

  const tiles = parseJson<MemoryTile[]>(round.tiles, []);
  const faceUp = new Set(parseJson<number[]>(round.faceUp, []));
  const matched = parseJson<Record<string, string>>(round.matched, {});
  const scores = parseJson<Record<string, number>>(round.scores, {});
  const players = parseJson<string[]>(round.players, []);
  const guests = await prisma.guest.findMany({
    where: { id: { in: [...new Set([...players, ...Object.keys(scores)])] } },
    select: { id: true, nickname: true },
  });
  const names = new Map(guests.map((row) => [row.id, nicknameOf(row)]));
  const finished = Boolean(round.endedAt);
  const started = round.startedAt?.getTime() ?? null;

  return {
    live: !finished,
    finished,
    tiles: tiles.map((tile, index) => {
      const owner = matched[String(index)];
      const open = faceUp.has(index) || Boolean(owner);
      return {
        icon: open ? tile.icon : null,
        joker: tile.pair === JOKER_PAIR,
        matched: Boolean(owner),
        mine: owner === guestId,
        faceUp: faceUp.has(index),
      };
    }),
    scores: players.map((id) => ({
      guestId: id,
      name: names.get(id) ?? "Misafir",
      score: scores[id] ?? 0,
      isMe: id === guestId,
    })),
    turnGuestId: round.turnGuestId,
    isMyTurn: players.length < 2 || round.turnGuestId === guestId,
    elapsedMs: started
      ? Math.max(0, (round.endedAt?.getTime() ?? Date.now()) - started)
      : 0,
    moves: round.moves,
    pairsLeft: countPairsLeft(tiles.map((tile, index) => ({
      matched: Boolean(matched[String(index)]),
      joker: tile.pair === JOKER_PAIR,
    }))),
  };
}

function countPairsLeft(tiles: { matched: boolean; joker: boolean }[]) {
  const closed = tiles.filter((tile) => !tile.matched);
  const joker = closed.some((tile) => tile.joker) ? 1 : 0;
  return Math.ceil((closed.length - joker) / 2) + joker;
}

export async function GET() {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  return NextResponse.json(await payload(guest.id, guest.tableSessionId));
}

export async function POST(request: Request) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    action?: "start" | "flip";
    index?: number;
  } | null;

  if (body?.action === "start") {
    const tiles = dealMemoryBoard();
    await prisma.memoryRound.create({
      data: {
        tableSessionId: guest.tableSessionId,
        tiles: JSON.stringify(tiles),
        players: JSON.stringify([guest.id]),
        turnGuestId: guest.id,
        scores: JSON.stringify({ [guest.id]: 0 }),
      },
    });
    await notifyTableGuests(
      guest.tableSessionId,
      "Hafıza",
      `${nicknameOf(guest)} hafıza açtı.`,
      guest.id,
    );
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  let live = await prisma.memoryRound.findFirst({
    where: { tableSessionId: guest.tableSessionId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!live) {
    return NextResponse.json({ error: "Tur yok." }, { status: 409 });
  }
  live = await syncRound(live);

  if (body?.action !== "flip") {
    return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
  }

  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= MEMORY_SIZE) {
    return NextResponse.json({ error: "Kart yok." }, { status: 400 });
  }

  const tiles = parseJson<MemoryTile[]>(live.tiles, []);
  const faceUp = parseJson<number[]>(live.faceUp, []);
  const matched = parseJson<Record<string, string>>(live.matched, {});
  const scores = parseJson<Record<string, number>>(live.scores, {});
  let players = parseJson<string[]>(live.players, []);

  if (!players.includes(guest.id)) {
    players = [...players, guest.id];
    scores[guest.id] = scores[guest.id] ?? 0;
  }
  if (players.length > 1 && live.turnGuestId && live.turnGuestId !== guest.id) {
    return NextResponse.json({ error: "Sıra sende değil." }, { status: 409 });
  }
  if (matched[String(index)] || faceUp.includes(index) || faceUp.length >= 2) {
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  const now = new Date();
  const startedAt = live.startedAt ?? now;
  const tile = tiles[index];
  if (!tile) {
    return NextResponse.json({ error: "Kart yok." }, { status: 400 });
  }

  if (tile.pair === JOKER_PAIR) {
    matched[String(index)] = guest.id;
    scores[guest.id] = (scores[guest.id] ?? 0) + 1;
    const done = Object.keys(matched).length >= MEMORY_SIZE;
    await prisma.memoryRound.update({
      where: { id: live.id },
      data: {
        matched: JSON.stringify(matched),
        scores: JSON.stringify(scores),
        players: JSON.stringify(players),
        turnGuestId: guest.id,
        startedAt,
        moves: live.moves + 1,
        endedAt: done ? now : null,
        faceUp: JSON.stringify(faceUp),
        hideAt: null,
      },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  const nextFace = [...faceUp, index];
  let hideAt: Date | null = null;
  let turn = guest.id;
  let moves = live.moves;
  if (nextFace.length === 1) {
    moves += 1;
  }
  if (nextFace.length === 2) {
    const other = tiles[nextFace[0]!];
    if (other && other.pair === tile.pair) {
      matched[String(nextFace[0])] = guest.id;
      matched[String(index)] = guest.id;
      scores[guest.id] = (scores[guest.id] ?? 0) + 1;
      nextFace.length = 0;
    } else {
      hideAt = new Date(Date.now() + MEMORY_HIDE_MS);
    }
  }

  const done = Object.keys(matched).length >= MEMORY_SIZE;
  await prisma.memoryRound.update({
    where: { id: live.id },
    data: {
      faceUp: JSON.stringify(nextFace),
      matched: JSON.stringify(matched),
      scores: JSON.stringify(scores),
      players: JSON.stringify(players),
      turnGuestId: turn,
      hideAt,
      startedAt,
      moves,
      endedAt: done ? now : null,
    },
  });
  return NextResponse.json(await payload(guest.id, guest.tableSessionId));
}
