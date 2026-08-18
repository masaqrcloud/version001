import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const staff = await prisma.user.findMany({
    where: { venueId: user.venueId, role: { not: "PLATFORM" } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Önce bir mekan seç" }, { status: 400 });
  }

  const body = z
    .object({
      email: z.string().email(),
      name: z.string().trim().min(2).max(60),
      password: z.string().min(6),
      role: z.enum(["OWNER", "ADMIN", "WAITER", "KITCHEN"]),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json(
      { error: "Ad, e-posta ve en az 6 karakter şifre yaz" },
      { status: 400 },
    );
  }

  if (body.data.role === "OWNER" && !user.isPlatform) {
    return NextResponse.json(
      { error: "Mekan sahibini sadece uygulama sahibi ekler" },
      { status: 403 },
    );
  }

  try {
    const created = await prisma.user.create({
      data: {
        venueId: user.venueId,
        email: body.data.email.toLowerCase(),
        name: body.data.name,
        passwordHash: await bcrypt.hash(body.data.password, 10),
        role: body.data.role,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json(created);
  } catch {
    return NextResponse.json(
      { error: "Bu e-posta zaten kayıtlı" },
      { status: 409 },
    );
  }
}
