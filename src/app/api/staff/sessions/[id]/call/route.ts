import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyGuest } from "@/lib/notify";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const { id } = await context.params;
  const session = await prisma.tableSession.findFirst({
    where: { id, table: { venueId: user.venueId } },
    include: { guests: true, table: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 404 });
  }

  await prisma.tableSession.update({
    where: { id },
    data: { waiterCalledAt: null },
  });

  const named = session.guests.filter((guest) => guest.nickname?.trim());
  try {
    await Promise.all(
      named.map((guest) =>
        notifyGuest(
          guest.id,
          "Garson geliyor",
          `Masa ${session.table.number} için garson yolda.`,
        ),
      ),
    );
  } catch {
    // sessiz
  }

  return NextResponse.json({ ok: true });
}
