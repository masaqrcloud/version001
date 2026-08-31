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
      number: z.string().trim().min(1).max(20).optional(),
      floorX: z.number().int().min(0).max(1000).optional(),
      floorY: z.number().int().min(0).max(1000).optional(),
    })
    .refine(
      (value) =>
        value.number !== undefined ||
        (value.floorX !== undefined && value.floorY !== undefined),
      { message: "Güncellenecek masa bilgisi gerekli" },
    )
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
      data: {
        ...(body.data.number !== undefined
          ? { number: body.data.number }
          : {}),
        ...(body.data.floorX !== undefined && body.data.floorY !== undefined
          ? { floorX: body.data.floorX, floorY: body.data.floorY }
          : {}),
      },
    });
    return NextResponse.json(table);
  } catch {
    return NextResponse.json(
      {
        error:
          body.data.number !== undefined
            ? "Bu masa numarası zaten var"
            : "Masa konumu kaydedilemedi",
      },
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
