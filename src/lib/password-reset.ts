import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

export function resetUrl(token: string) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
}

export async function issuePasswordReset(userId: string) {
  const next = newResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: next.tokenHash,
        expiresAt: next.expiresAt,
      },
    }),
  ]);
  return next.token;
}
