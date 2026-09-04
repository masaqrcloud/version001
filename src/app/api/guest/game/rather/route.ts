import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  RATHER_ALL,
  categoryLabel,
  categoryStats,
  isRatherCategory,
  parseSeenIds,
  parseVotes,
  pickRatherQuestion,
  questionById,
} from "@/lib/rather";

function nicknameOf(guest: { nickname: string | null }) {
  const name = guest.nickname?.trim();
  if (!name || isStaffProxyNickname(name)) return "Misafir";
  return name;
}

async function payload(guestId: string, sessionId: string) {
  const round = await prisma.ratherRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });
  const guests = await prisma.guest.findMany({
    where: { tableSessionId: sessionId },
    select: { id: true, nickname: true },
  });
  const names = new Map(guests.map((row) => [row.id, nicknameOf(row)]));
  const question = round ? questionById(round.questionId) : null;
  const votes = round ? parseVotes(round.votes) : {};
  const a: string[] = [];
  const b: string[] = [];
  for (const [id, choice] of Object.entries(votes)) {
    const name = names.get(id);
    if (!name) continue;
    if (choice === "a") a.push(name);
    if (choice === "b") b.push(name);
  }
  return {
    live: Boolean(round && question),
    category: round?.category ?? RATHER_ALL,
    categories: categoryStats(),
    question: question
      ? {
          id: question.id,
          category: question.cat,
          categoryLabel: categoryLabel(question.cat),
          a: question.a,
          b: question.b,
        }
      : null,
    mine: votes[guestId] === "a" || votes[guestId] === "b" ? votes[guestId] : null,
    tallies: { a: a.length, b: b.length },
    names: { a, b },
    remaining: Math.max(
      0,
      (round ? poolSize(round.category) : 0) - parseSeenIds(round?.seenIds ?? "").length,
    ),
  };
}

function poolSize(category: string) {
  return categoryStats().find((row) => row.id === category)?.count ?? 0;
}

function normalizeCategory(id?: string) {
  if (!id || id === RATHER_ALL) return RATHER_ALL;
  return isRatherCategory(id) ? id : RATHER_ALL;
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
    action?: "start" | "vote" | "next";
    category?: string;
    choice?: "a" | "b";
  } | null;

  let live = await prisma.ratherRound.findFirst({
    where: { tableSessionId: guest.tableSessionId },
    orderBy: { createdAt: "desc" },
  });

  if (body?.action === "start") {
    const category = normalizeCategory(body.category);
    const picked = pickRatherQuestion(category, []);
    if (!picked) {
      return NextResponse.json({ error: "Soru yok." }, { status: 503 });
    }
    await prisma.ratherRound.create({
      data: {
        tableSessionId: guest.tableSessionId,
        category,
        questionId: picked.id,
        seenIds: picked.id,
        votes: "{}",
      },
    });
    await notifyTableGuests(
      guest.tableSessionId,
      "Cevap Ver",
      `${nicknameOf(guest)} bir soru açtı.`,
      guest.id,
    );
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (!live) {
    return NextResponse.json({ error: "Tur yok." }, { status: 409 });
  }

  if (body?.action === "vote") {
    const choice = body.choice === "b" ? "b" : body.choice === "a" ? "a" : null;
    if (!choice) {
      return NextResponse.json({ error: "Seçim yok." }, { status: 400 });
    }
    const votes = parseVotes(live.votes);
    votes[guest.id] = choice;
    await prisma.ratherRound.update({
      where: { id: live.id },
      data: { votes: JSON.stringify(votes) },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "next") {
    const category = body.category ? normalizeCategory(body.category) : live.category;
    const seen = parseSeenIds(live.seenIds);
    const picked = pickRatherQuestion(category, seen);
    if (!picked) {
      return NextResponse.json({ error: "Soru kalmadı." }, { status: 409 });
    }
    const nextSeen = category === live.category ? [...seen, picked.id] : [picked.id];
    await prisma.ratherRound.update({
      where: { id: live.id },
      data: {
        category,
        questionId: picked.id,
        votes: "{}",
        seenIds: nextSeen.join(","),
      },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
}
