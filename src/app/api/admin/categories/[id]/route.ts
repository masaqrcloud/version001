import { NextResponse } from "next/server";
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
      name: z.string().trim().min(1).max(60).optional(),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
  }

  const existing = await prisma.menuCategory.findFirst({
    where: { id, venueId: user.venueId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kategori yok" }, { status: 404 });
  }

  const category = await prisma.menuCategory.update({
    where: { id },
    data: body.data,
  });
  return NextResponse.json(category);
}

export async function DELETE(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  await prisma.menuCategory.deleteMany({
    where: { id, venueId: user.venueId },
  });
  return NextResponse.json({ ok: true });
}
