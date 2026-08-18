import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { slugify } from "@/lib/slug";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const venues = await prisma.venue.findMany({
    where: user.isPlatform ? undefined : { id: user.venueId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tables: true, users: true, categories: true } },
    },
  });

  return NextResponse.json({
    activeVenueId: user.venueId,
    venues: venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      logoUrl: venue.logoUrl,
      coverUrl: venue.coverUrl,
      tagline: venue.tagline,
      tableCount: venue._count.tables,
      staffCount: venue._count.users,
      categoryCount: venue._count.categories,
      isActive: venue.id === user.venueId,
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM"]);
  if (error) return error;
  if (!user.isPlatform) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = z
    .object({
      name: z.string().trim().min(2).max(80),
      slug: z.string().trim().optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Mekan adı en az 2 karakter olmalı" }, { status: 400 });
  }

  const slug = slugify(body.data.slug || body.data.name);
  if (slug.length < 2) {
    return NextResponse.json({ error: "Geçerli bir kısa ad yaz" }, { status: 400 });
  }

  try {
    const venue = await prisma.venue.create({
      data: { name: body.data.name, slug },
    });
    return NextResponse.json(venue);
  } catch {
    return NextResponse.json(
      { error: "Bu kısa ad kullanılıyor, başka bir ad dene" },
      { status: 409 },
    );
  }
}
