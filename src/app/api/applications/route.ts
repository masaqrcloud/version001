import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendApplicationMail } from "@/lib/application-mail";

const applicationSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(120),
  venueName: z.string().trim().min(2).max(100),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const body = applicationSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!body.success) {
    return NextResponse.json(
      { error: "Bilgileri kontrol edip tekrar dene." },
      { status: 400 },
    );
  }

  const email = body.data.email.toLowerCase();
  const recent = await prisma.application.findFirst({
    where: {
      email,
      venueName: body.data.venueName,
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });

  if (recent) {
    return NextResponse.json(
      { error: "Başvurun zaten alındı." },
      { status: 409 },
    );
  }

  const application = await prisma.application.create({
    data: {
      fullName: body.data.fullName,
      email,
      venueName: body.data.venueName,
    },
  });

  try {
    await sendApplicationMail(application);
  } catch (error) {
    console.error("Başvuru e-postası gönderilemedi", error);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
