import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

export async function POST(request: Request) {
  const body = z
    .object({
      venueName: z.string().trim().min(2).max(80),
      slug: z.string().trim().optional(),
      ownerName: z.string().trim().min(2).max(60),
      email: z.string().email(),
      password: z.string().min(6),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json(
      { error: "Alanları kontrol et. Şifre en az 6 karakter olmalı." },
      { status: 400 },
    );
  }

  const slug = slugify(body.data.slug || body.data.venueName);
  if (slug.length < 2) {
    return NextResponse.json({ error: "Geçerli bir kısa ad yaz" }, { status: 400 });
  }

  const email = body.data.email.toLowerCase();
  const [slugTaken, emailTaken] = await Promise.all([
    prisma.venue.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (slugTaken) {
    return NextResponse.json(
      { error: "Bu kısa ad kullanılıyor, başka bir ad dene" },
      { status: 409 },
    );
  }
  if (emailTaken) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kayıtlı" },
      { status: 409 },
    );
  }

  const venue = await prisma.venue.create({
    data: {
      name: body.data.venueName,
      slug,
      users: {
        create: {
          name: body.data.ownerName,
          email,
          passwordHash: await bcrypt.hash(body.data.password, 10),
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({
    venueId: venue.id,
    slug: venue.slug,
    email,
  });
}
