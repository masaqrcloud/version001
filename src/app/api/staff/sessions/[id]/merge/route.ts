import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { absorbSession, formatTableGroup } from "@/lib/table-groups";
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
    .object({
      targetTableId: z.string().min(1).optional(),
      targetSessionId: z.string().min(1).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!body.success || (!body.data.targetTableId && !body.data.targetSessionId)) {
    return NextResponse.json({ error: "Hedef masa seç" }, { status: 400 });
  }

  const source = await prisma.tableSession.findFirst({
    where: { id, status: "OPEN", table: { venueId: user.venueId } },
    include: { table: true, mergedTables: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Açık masa bulunamadı" }, { status: 404 });
  }

  const targetTable = body.data.targetTableId
    ? await prisma.table.findFirst({
        where: { id: body.data.targetTableId, venueId: user.venueId },
        include: {
          sessions: { where: { status: "OPEN" } },
          mergedSession: true,
        },
      })
    : await prisma.tableSession
        .findFirst({
          where: {
            id: body.data.targetSessionId,
            status: "OPEN",
            table: { venueId: user.venueId },
          },
          include: { table: true },
        })
        .then((session) =>
          session
            ? prisma.table.findFirst({
                where: { id: session.tableId },
                include: {
                  sessions: { where: { status: "OPEN" } },
                  mergedSession: true,
                },
              })
            : null,
        );

  if (!targetTable) {
    return NextResponse.json({ error: "Hedef masa bulunamadı" }, { status: 404 });
  }
  if (targetTable.id === source.tableId) {
    return NextResponse.json({ error: "Aynı masa birleştirilemez" }, { status: 400 });
  }
  if (source.mergedTables.some((table) => table.id === targetTable.id)) {
    return NextResponse.json({ error: "Bu masa zaten birleşik" }, { status: 409 });
  }
  if (
    targetTable.mergedSessionId &&
    targetTable.mergedSessionId !== source.id &&
    targetTable.mergedSession?.status === "OPEN"
  ) {
    return NextResponse.json(
      { error: "Hedef masa başka bir grupta birleşik" },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const otherOpen of targetTable.sessions) {
      if (otherOpen.id !== source.id) {
        await absorbSession(tx, otherOpen.id, source.id);
      }
    }
    await tx.table.update({
      where: { id: targetTable.id },
      data: { mergedSessionId: source.id },
    });
  });

  const extras = await prisma.table.findMany({
    where: { mergedSessionId: source.id },
    select: { number: true },
  });

  return NextResponse.json({
    ok: true,
    sessionId: source.id,
    message: `${tableLabel(formatTableGroup(source.table.number, extras.map((table) => table.number)))} birleşti.`,
  });
}
