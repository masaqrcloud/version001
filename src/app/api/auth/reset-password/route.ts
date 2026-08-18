import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashResetToken } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Bağlantı veya şifre geçersiz." },
      { status: 400 },
    );
  }

  const tokenHash = hashResetToken(body.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "Bu bağlantının süresi dolmuş veya daha önce kullanılmış." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new Error("RESET_TOKEN_USED");
      }
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      });
    });
  } catch {
    return NextResponse.json(
      { error: "Bu bağlantı artık kullanılamıyor." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
