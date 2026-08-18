import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";

async function saveNickname(request: Request) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }

  const body = z
    .object({ nickname: z.string().trim().min(1).max(40) })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz isim" }, { status: 400 });
  }

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: { nickname: body.data.nickname },
  });

  return NextResponse.json({ nickname: updated.nickname });
}

export async function POST(request: Request) {
  return saveNickname(request);
}

export async function PATCH(request: Request) {
  return saveNickname(request);
}
