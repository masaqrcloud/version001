import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  const body = z
    .object({
      name: z.string().trim().min(2).max(60).optional(),
      role: z.enum(["OWNER", "ADMIN", "WAITER", "KITCHEN"]).optional(),
      password: z.string().min(6).optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz güncelleme" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, venueId: user.venueId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Personel yok" }, { status: 404 });
  }

  if (existing.role === "OWNER" && body.data.role && body.data.role !== "OWNER") {
    return NextResponse.json(
      { error: "Sahip rolü değiştirilemez" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: body.data.name,
      role: body.data.role,
      passwordHash: body.data.password
        ? await bcrypt.hash(body.data.password, 10)
        : undefined,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  if (id === user.id) {
    return NextResponse.json(
      { error: "Kendi hesabını silemezsin" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: { id, venueId: user.venueId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Personel yok" }, { status: 404 });
  }
  if (existing.role === "OWNER" && !user.isPlatform) {
    return NextResponse.json({ error: "Sahip silinemez" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
