import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getGuestFromCookie,
  verifySignedGuestToken,
} from "@/lib/guest";

export async function POST(request: Request) {
  const body = z
    .object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().trim().max(500).optional(),
      token: z.string().max(500).optional(),
    })
    .safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz değerlendirme" }, { status: 400 });
  }

  const rawToken = body.data.token
    ? verifySignedGuestToken(body.data.token)
    : null;
  const guest = rawToken
    ? await prisma.guest.findUnique({
        where: { guestToken: rawToken },
        include: { tableSession: true },
      })
    : await getGuestFromCookie();
  if (!guest || guest.tableSession.status !== "CLOSED") {
    return NextResponse.json(
      { error: "Kapanmış oturum bulunamadı" },
      { status: 404 },
    );
  }
  const hasOrder = await prisma.order.count({ where: { guestId: guest.id } });
  if (!hasOrder) {
    return NextResponse.json(
      { error: "Değerlendirilecek sipariş bulunamadı" },
      { status: 409 },
    );
  }

  try {
    const feedback = await prisma.sessionFeedback.create({
      data: {
        tableSessionId: guest.tableSessionId,
        guestId: guest.id,
        rating: body.data.rating,
        comment: body.data.comment || null,
      },
    });
    return NextResponse.json({ ok: true, id: feedback.id });
  } catch {
    return NextResponse.json(
      { error: "Bu deneyimi daha önce değerlendirdiniz" },
      { status: 409 },
    );
  }
}
