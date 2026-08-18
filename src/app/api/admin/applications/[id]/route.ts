import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import { newResetToken, resetUrl } from "@/lib/password-reset";
import {
  sendApplicationApprovedMail,
  sendApplicationRejectedMail,
} from "@/lib/account-mail";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(request: Request, context: Context) {
  const { user, error } = await getStaffUser(["PLATFORM"]);
  if (error) return error;
  if (!user.isPlatform) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }

  const { id } = await context.params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
  }
  if (application.status !== "NEW") {
    return NextResponse.json(
      { error: "Bu başvuru daha önce sonuçlandırılmış" },
      { status: 409 },
    );
  }

  if (body.data.action === "reject") {
    await prisma.application.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
    let emailSent = true;
    try {
      await sendApplicationRejectedMail(
        application.email,
        application.fullName,
        application.venueName,
      );
    } catch (mailError) {
      emailSent = false;
      console.error("Ret e-postası gönderilemedi", mailError);
    }
    return NextResponse.json({ ok: true, status: "REJECTED", emailSent });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: application.email },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Bu e-posta ile zaten bir hesap var" },
      { status: 409 },
    );
  }

  const baseSlug = slugify(application.venueName) || "mekan";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.venue.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const reset = newResetToken();
  const unusablePassword = await bcrypt.hash(
    randomBytes(32).toString("hex"),
    12,
  );

  await prisma.$transaction(async (tx) => {
    const venue = await tx.venue.create({
      data: { name: application.venueName, slug },
    });
    const owner = await tx.user.create({
      data: {
        email: application.email,
        name: application.fullName,
        passwordHash: unusablePassword,
        role: "OWNER",
        venueId: venue.id,
      },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: owner.id,
        tokenHash: reset.tokenHash,
        expiresAt: reset.expiresAt,
      },
    });
    await tx.application.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
  });

  let emailSent = true;
  try {
    await sendApplicationApprovedMail(
      application.email,
      application.fullName,
      application.venueName,
      resetUrl(reset.token),
    );
  } catch (mailError) {
    emailSent = false;
    console.error("Onay e-postası gönderilemedi", mailError);
  }

  return NextResponse.json({
    ok: true,
    status: "APPROVED",
    emailSent,
  });
}
