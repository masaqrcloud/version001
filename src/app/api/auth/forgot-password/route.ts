import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendPasswordResetMail } from "@/lib/account-mail";
import { issuePasswordReset, resetUrl } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email().max(120) });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  const response = {
    message: "Bu e-posta kayıtlıysa şifre yenileme bağlantısı gönderildi.",
  };

  if (!body.success) {
    return NextResponse.json(response);
  }

  const user = await prisma.user.findUnique({
    where: { email: body.data.email.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json(response);
  }
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });
  if (recentToken) {
    return NextResponse.json(response);
  }

  const token = await issuePasswordReset(user.id);
  try {
    await sendPasswordResetMail(user.email, user.name, resetUrl(token));
  } catch (error) {
    console.error("Şifre yenileme e-postası gönderilemedi", error);
  }

  return NextResponse.json(response);
}
