import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { releaseMergedTables } from "@/lib/table-groups";
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
    .object({ targetTableId: z.string().min(1) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Boş masa seç" }, { status: 400 });
  }

  const source = await prisma.tableSession.findFirst({
    where: { id, status: "OPEN", table: { venueId: user.venueId } },
    include: { table: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Açık masa bulunamadı" }, { status: 404 });
  }

  const target = await prisma.table.findFirst({
    where: { id: body.data.targetTableId, venueId: user.venueId },
    include: {
      sessions: { where: { status: "OPEN" }, take: 1 },
      mergedSession: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Hedef masa bulunamadı" }, { status: 404 });
  }
  if (target.id === source.tableId) {
    return NextResponse.json({ error: "Aynı masaya aktarılamaz" }, { status: 400 });
  }
  const targetBusy =
    target.sessions.length > 0 ||
    (target.mergedSessionId && target.mergedSession?.status === "OPEN");
  if (targetBusy) {
    return NextResponse.json(
      { error: "Aktarım yalnızca boş masaya yapılır. Dolu masalar için birleştir." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await releaseMergedTables(tx, source.id);
    await tx.tableSession.update({
      where: { id: source.id },
      data: { tableId: target.id },
    });
  });

  return NextResponse.json({
    ok: true,
    sessionId: source.id,
    message: `Masa ${source.table.number} hesabı Masa ${target.number} masasına aktarıldı.`,
  });
}
