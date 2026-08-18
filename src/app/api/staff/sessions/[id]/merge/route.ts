import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
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
    .object({ targetSessionId: z.string().min(1) })
    .safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Hedef masa seç" }, { status: 400 });
  }
  if (body.data.targetSessionId === id) {
    return NextResponse.json({ error: "Aynı masa birleştirilemez" }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    prisma.tableSession.findFirst({
      where: { id, status: "OPEN", table: { venueId: user.venueId } },
      include: { table: true, bill: true },
    }),
    prisma.tableSession.findFirst({
      where: {
        id: body.data.targetSessionId,
        status: "OPEN",
        table: { venueId: user.venueId },
      },
      include: { table: true },
    }),
  ]);

  if (!source || !target) {
    return NextResponse.json({ error: "Açık masa bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.guest.updateMany({
      where: { tableSessionId: source.id },
      data: { tableSessionId: target.id },
    });
    await tx.order.updateMany({
      where: { tableSessionId: source.id },
      data: { tableSessionId: target.id },
    });
    if (source.bill) {
      await tx.bill.delete({ where: { id: source.bill.id } });
    }
    await tx.tableSession.update({
      where: { id: source.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        waiterCalledAt: null,
      },
    });
    if (source.waiterCalledAt && !target.waiterCalledAt) {
      await tx.tableSession.update({
        where: { id: target.id },
        data: { waiterCalledAt: source.waiterCalledAt },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    targetSessionId: target.id,
    message: `Masa ${source.table.number}, Masa ${target.table.number} ile birleşti.`,
  });
}
