import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  advanceBracket,
  aliveCount,
  categoryLabel,
  categoryStats,
  isBestOfCategory,
  itemById,
  parseJson,
  parseVotes,
  roundLabel,
  startBracket,
  winnerSide,
} from "@/lib/bestof";

function nicknameOf(guest: { nickname: string | null }) {
  const name = guest.nickname?.trim();
  if (!name || isStaffProxyNickname(name)) return "Misafir";
  return name;
}

async function voterIds(sessionId: string, fallbackId: string) {
  const guests = await prisma.guest.findMany({
    where: { tableSessionId: sessionId },
    select: { id: true, nickname: true },
  });
  const ids = guests
    .filter((row) => !isStaffProxyNickname(row.nickname))
    .map((row) => row.id);
  return ids.length ? ids : [fallbackId];
}

function pairOf(raw: string) {
  const pair = parseJson<string[]>(raw, []);
  if (pair.length === 2 && pair[0] && pair[1]) return [pair[0], pair[1]] as [string, string];
  return null;
}

async function payload(guestId: string, sessionId: string) {
  const round = await prisma.bestOfRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });
  const guests = await prisma.guest.findMany({
    where: { tableSessionId: sessionId },
    select: { id: true, nickname: true },
  });
  const names = new Map(guests.map((row) => [row.id, nicknameOf(row)]));
  const needed = await voterIds(sessionId, guestId);
  const votes = round ? parseVotes(round.votes) : {};
  const pair = round ? pairOf(round.pair) : null;
  const aItem = pair ? itemById(pair[0]) : null;
  const bItem = pair ? itemById(pair[1]) : null;
  const champion = round?.championId ? itemById(round.championId) : null;
  const a: string[] = [];
  const b: string[] = [];
  for (const [id, choice] of Object.entries(votes)) {
    const name = names.get(id);
    if (!name) continue;
    if (choice === "a") a.push(name);
    if (choice === "b") b.push(name);
  }
  const voted = needed.filter((id) => votes[id] === "a" || votes[id] === "b").length;
  const queue = round ? parseJson<string[]>(round.queue, []) : [];
  const winners = round ? parseJson<string[]>(round.winners, []) : [];
  const alive = aliveCount(queue, winners, pair);
  const live = Boolean(round && (champion || (aItem && bItem)));

  return {
    live,
    category: round?.category ?? null,
    categoryLabel: round ? categoryLabel(round.category) : null,
    categories: categoryStats(),
    pair:
      aItem && bItem
        ? { a: { id: aItem.id, name: aItem.name }, b: { id: bItem.id, name: bItem.name } }
        : null,
    champion: champion ? { id: champion.id, name: champion.name } : null,
    mine: votes[guestId] === "a" || votes[guestId] === "b" ? votes[guestId] : null,
    tallies: { a: a.length, b: b.length },
    names: { a, b },
    voted,
    needed: needed.length,
    tied: Boolean(
      pair && voted === needed.length && winnerSide(votes, needed) == null,
    ),
    roundLabel: champion ? "Şampiyon" : roundLabel(alive),
    left: champion ? 1 : alive,
  };
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
    action?: "start" | "vote" | "end";
    category?: string;
    choice?: "a" | "b";
  } | null;

  if (body?.action === "start") {
    if (!isBestOfCategory(body.category ?? "")) {
      return NextResponse.json({ error: "Kategori seç." }, { status: 400 });
    }
    const started = startBracket(body.category as string);
    if (!started || !started.pair) {
      return NextResponse.json({ error: "Liste yok." }, { status: 503 });
    }
    await prisma.bestOfRound.create({
      data: {
        tableSessionId: guest.tableSessionId,
        category: body.category as string,
        queue: JSON.stringify(started.queue),
        winners: JSON.stringify(started.winners),
        pair: JSON.stringify(started.pair),
        votes: "{}",
        championId: null,
      },
    });
    await notifyTableGuests(
      guest.tableSessionId,
      "noticeBestOf",
      { name: nicknameOf(guest), category: String(body.category) },
      guest.id,
    );
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  const live = await prisma.bestOfRound.findFirst({
    where: { tableSessionId: guest.tableSessionId },
    orderBy: { createdAt: "desc" },
  });
  if (!live) {
    return NextResponse.json({ error: "Tur yok." }, { status: 409 });
  }
  if (body?.action === "end") {
    await prisma.bestOfRound.update({
      where: { id: live.id },
      data: {
        queue: "[]",
        winners: "[]",
        pair: "[]",
        votes: "{}",
        championId: null,
      },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (live.championId) {
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "vote") {
    const choice = body.choice === "b" ? "b" : body.choice === "a" ? "a" : null;
    if (!choice) {
      return NextResponse.json({ error: "Seçim yok." }, { status: 400 });
    }
    const pair = pairOf(live.pair);
    if (!pair) {
      return NextResponse.json({ error: "Eşleşme yok." }, { status: 409 });
    }
    const votes = parseVotes(live.votes);
    votes[guest.id] = choice;
    const needed = await voterIds(guest.tableSessionId, guest.id);
    const side = winnerSide(votes, needed);
    if (!side) {
      await prisma.bestOfRound.update({
        where: { id: live.id },
        data: { votes: JSON.stringify(votes) },
      });
      return NextResponse.json(await payload(guest.id, guest.tableSessionId));
    }
    const next = advanceBracket(
      parseJson<string[]>(live.queue, []),
      parseJson<string[]>(live.winners, []),
      pair,
      side,
    );
    await prisma.bestOfRound.update({
      where: { id: live.id },
      data: {
        queue: JSON.stringify(next.queue),
        winners: JSON.stringify(next.winners),
        pair: next.pair ? JSON.stringify(next.pair) : "[]",
        votes: "{}",
        championId: next.championId,
      },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
}
