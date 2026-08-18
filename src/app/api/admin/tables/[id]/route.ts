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
    .object({ number: z.string().trim().min(1).max(20) })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz masa" }, { status: 400 });
  }

  const existing = await prisma.table.findFirst({
    where: { id, venueId: user.venueId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Masa yok" }, { status: 404 });
  }

  try {
    const table = await prisma.table.update({
      where: { id },
      data: { number: body.data.number },
    });
    return NextResponse.json(table);
  } catch {
    return NextResponse.json(
      { error: "Bu masa numarası zaten var" },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  await prisma.table.deleteMany({ where: { id, venueId: user.venueId } });
  return NextResponse.json({ ok: true });
}
