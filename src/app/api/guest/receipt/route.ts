import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOpenGuest } from "@/lib/guest";

const schema = z.object({ email: z.string().trim().email().max(120) });

export async function POST(request: Request) {
  const guest = await requireOpenGuest();
  if (!guest) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
  }
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçerli bir e-posta yaz." }, { status: 400 });
  }

  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      receiptEmail: body.data.email.toLowerCase(),
      receiptSentAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
