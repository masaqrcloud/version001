import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyGuest } from "@/lib/notify";
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
    .object({ kind: z.enum(["waiter", "bill"]).optional() })
    .safeParse(await request.json().catch(() => ({})));
  const kind = body.success && body.data.kind === "bill" ? "bill" : "waiter";

  const session = await prisma.tableSession.findFirst({
    where: { id, table: { venueId: user.venueId } },
    include: { guests: true, table: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 404 });
  }

  await prisma.tableSession.update({
    where: { id },
    data:
      kind === "bill" ? { billRequestedAt: null } : { waiterCalledAt: null },
  });

  const named = session.guests.filter((guest) => guest.nickname?.trim());
  try {
    await Promise.all(
      named.map((guest) =>
        notifyGuest(
          guest.id,
          kind === "bill" ? "Hesabın geliyor" : "Garson geliyor",
          kind === "bill"
            ? `${tableLabel(session.table.number)} için hesap alınıyor.`
            : `${tableLabel(session.table.number)} için garson yolda.`,
        ),
      ),
    );
  } catch {
    // sessiz
  }

  return NextResponse.json({ ok: true });
}
