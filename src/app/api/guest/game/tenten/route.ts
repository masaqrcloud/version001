import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";
import { isStaffProxyNickname } from "@/lib/media";
import { notifyTableGuests } from "@/lib/notify";
import {
  TENTEN_QUESTIONS,
  averageOf,
  clampScore,
  parseScores,
  parseSeenIds,
  pickTenTenPrompt,
  promptById,
} from "@/lib/tenten";

function nicknameOf(guest: { nickname: string | null }) {
  const name = guest.nickname?.trim();
  if (!name || isStaffProxyNickname(name)) return "Misafir";
  return name;
}

async function payload(guestId: string, sessionId: string) {
  const round = await prisma.tenTenRound.findFirst({
    where: { tableSessionId: sessionId },
    orderBy: { createdAt: "desc" },
  });
  const guests = await prisma.guest.findMany({
    where: { tableSessionId: sessionId },
    select: { id: true, nickname: true },
  });
  const names = new Map(guests.map((row) => [row.id, nicknameOf(row)]));
  const prompt = round ? promptById(round.promptId) : null;
  const scores = round ? parseScores(round.scores) : {};
  const ratings = Object.entries(scores)
    .map(([id, score]) => {
      const name = names.get(id);
      if (!name) return null;
      return { name, score, isMe: id === guestId };
    })
    .filter((row): row is { name: string; score: number; isMe: boolean } => Boolean(row))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "tr"));

  return {
    live: Boolean(round && prompt),
    prompt: prompt ? { id: prompt.id, text: prompt.text } : null,
    mine: scores[guestId] ?? null,
    average: averageOf(scores),
    count: Object.keys(scores).length,
    ratings,
    remaining: Math.max(0, TENTEN_QUESTIONS.length - parseSeenIds(round?.seenIds ?? "").length),
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
    action?: "start" | "rate" | "next";
    score?: unknown;
  } | null;

  let live = await prisma.tenTenRound.findFirst({
    where: { tableSessionId: guest.tableSessionId },
    orderBy: { createdAt: "desc" },
  });

  if (body?.action === "start") {
    const picked = pickTenTenPrompt([]);
    if (!picked) {
      return NextResponse.json({ error: "Soru yok." }, { status: 503 });
    }
    await prisma.tenTenRound.create({
      data: {
        tableSessionId: guest.tableSessionId,
        promptId: picked.id,
        seenIds: picked.id,
        scores: "{}",
      },
    });
    await notifyTableGuests(
      guest.tableSessionId,
      "noticeTenTen",
      { name: nicknameOf(guest) },
      guest.id,
    );
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (!live) {
    return NextResponse.json({ error: "Tur yok." }, { status: 409 });
  }

  if (body?.action === "rate") {
    const score = clampScore(body.score);
    if (score == null) {
      return NextResponse.json({ error: "Puan 1–10 olmalı." }, { status: 400 });
    }
    const scores = parseScores(live.scores);
    scores[guest.id] = score;
    await prisma.tenTenRound.update({
      where: { id: live.id },
      data: { scores: JSON.stringify(scores) },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  if (body?.action === "next") {
    const seen = parseSeenIds(live.seenIds);
    const picked = pickTenTenPrompt(seen);
    if (!picked) {
      return NextResponse.json({ error: "Soru kalmadı." }, { status: 409 });
    }
    await prisma.tenTenRound.update({
      where: { id: live.id },
      data: {
        promptId: picked.id,
        scores: "{}",
        seenIds: [...seen, picked.id].join(","),
      },
    });
    return NextResponse.json(await payload(guest.id, guest.tableSessionId));
  }

  return NextResponse.json({ error: "İşlem geçersiz." }, { status: 400 });
}
