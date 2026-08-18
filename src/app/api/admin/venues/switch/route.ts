import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ACTIVE_VENUE_COOKIE, getStaffUser } from "@/lib/tenant";

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM"]);
  if (error) return error;
  if (!user.isPlatform) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = z
    .object({ venueId: z.string().min(1) })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Mekan seç" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: body.data.venueId },
  });
  if (!venue) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, venue });
  response.cookies.set(ACTIVE_VENUE_COOKIE, venue.id, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
