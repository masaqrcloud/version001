import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tableLabel } from "@/lib/table-label";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const { id } = await context.params;
  const body = z
    .object({ tableId: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Masa seç" }, { status: 400 });
  }

  const session = await prisma.tableSession.findFirst({
    where: { id, status: "OPEN", table: { venueId: user.venueId } },
  });
  if (!session) {
    return NextResponse.json({ error: "Açık masa bulunamadı" }, { status: 404 });
  }

  const table = await prisma.table.findFirst({
    where: {
      id: body.data.tableId,
      venueId: user.venueId,
      mergedSessionId: session.id,
    },
  });
  if (!table) {
    return NextResponse.json({ error: "Bu masa bu grupta değil" }, { status: 404 });
  }

  await prisma.table.update({
    where: { id: table.id },
    data: { mergedSessionId: null },
  });

  return NextResponse.json({
    ok: true,
    message: `${tableLabel(table.number)} gruptan ayrıldı.`,
  });
}
