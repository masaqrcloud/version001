import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { slugify } from "@/lib/slug";
import { isPublicImageUrl } from "@/lib/media";

function cleanImage(value: string | null | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() || null;
  if (trimmed && !isPublicImageUrl(trimmed)) {
    return "invalid";
  }
  return trimmed;
}

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const venue = await prisma.venue.findUnique({ where: { id: user.venueId } });
  return NextResponse.json(venue);
}

export async function PATCH(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const body = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      slug: z.string().trim().optional(),
      tagline: z.string().trim().max(120).nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      coverUrl: z.string().nullable().optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json(
      { error: "Mekan adı en az 2 karakter olmalı" },
      { status: 400 },
    );
  }

  const data: {
    name?: string;
    slug?: string;
    tagline?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
  } = {};
  if (body.data.name) data.name = body.data.name;
  if (body.data.slug !== undefined) {
    const slug = slugify(body.data.slug || body.data.name || "");
    if (slug.length < 2) {
      return NextResponse.json({ error: "Geçerli bir kısa ad yaz" }, { status: 400 });
    }
    data.slug = slug;
  }
  if (body.data.tagline !== undefined) {
    data.tagline = body.data.tagline?.trim() || null;
  }

  const logo = cleanImage(body.data.logoUrl);
  if (logo === "invalid") {
    return NextResponse.json({ error: "Logo adresi geçersiz" }, { status: 400 });
  }
  if (logo !== undefined) data.logoUrl = logo;

  const cover = cleanImage(body.data.coverUrl);
  if (cover === "invalid") {
    return NextResponse.json({ error: "Kapak adresi geçersiz" }, { status: 400 });
  }
  if (cover !== undefined) data.coverUrl = cover;

  try {
    const venue = await prisma.venue.update({
      where: { id: user.venueId },
      data,
    });
    return NextResponse.json(venue);
  } catch {
    return NextResponse.json(
      { error: "Bu kısa ad kullanılıyor" },
      { status: 409 },
    );
  }
}
