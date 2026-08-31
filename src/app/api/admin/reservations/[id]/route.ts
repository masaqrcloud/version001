import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { sendReservationStatusMail } from "@/lib/reservation-mail";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  action: z.enum(["confirm", "reject"]),
  tableId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, context: Context) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }
  const { id } = await context.params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, venueId: user.venueId },
    include: { venue: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Rezervasyon bulunamadı" }, { status: 404 });
  }
  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Bu rezervasyon daha önce sonuçlandırılmış" },
      { status: 409 },
    );
  }

  let table: { id: string; number: string } | null = null;
  const requestedTableId = body.data.tableId ?? reservation.tableId;
  if (body.data.action === "confirm" && requestedTableId) {
    table = await prisma.table.findFirst({
      where: { id: requestedTableId, venueId: user.venueId },
      select: { id: true, number: true },
    });
    if (!table) {
      return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
    }
    const conflict = await prisma.reservation.findFirst({
      where: {
        id: { not: reservation.id },
        tableId: table.id,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        status: "CONFIRMED",
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Bu masa aynı tarih ve saatte başka rezervasyona atanmış" },
        { status: 409 },
      );
    }
  }

  const status =
    body.data.action === "confirm" ? ("CONFIRMED" as const) : ("REJECTED" as const);
  await prisma.reservation.update({
    where: { id },
    data: {
      status,
      tableId: status === "CONFIRMED" ? table?.id ?? null : null,
      reviewedAt: new Date(),
    },
  });

  let emailSent = true;
  try {
    await sendReservationStatusMail(
      {
        email: reservation.email,
        fullName: reservation.fullName,
        venueName: reservation.venue.name,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        guestCount: reservation.guestCount,
        tableNumber: table?.number,
      },
      status,
    );
  } catch (mailError) {
    emailSent = false;
    console.error("Rezervasyon e-postası gönderilemedi", mailError);
  }

  return NextResponse.json({ ok: true, status, emailSent });
}
