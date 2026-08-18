import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOpeningHours } from "@/lib/opening-hours";

const schema = z.object({
  venueId: z.string().min(1),
  fullName: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(7).max(24),
  guestCount: z.number().int().min(1).max(30),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservationTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(400).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Rezervasyon bilgilerini kontrol et." },
      { status: 400 },
    );
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") =>
    dateParts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  if (body.data.reservationDate < today) {
    return NextResponse.json(
      { error: "Geçmiş bir tarih seçilemez." },
      { status: 400 },
    );
  }

  const venue = await prisma.venue.findUnique({
    where: { id: body.data.venueId },
    select: { id: true, openingHours: true },
  });
  if (!venue) {
    return NextResponse.json({ error: "Mekân bulunamadı." }, { status: 404 });
  }
  if (venue.openingHours) {
    const day = new Date(
      `${body.data.reservationDate}T12:00:00Z`,
    ).getUTCDay();
    const hours = parseOpeningHours(venue.openingHours).find(
      (entry) => entry.day === day,
    );
    const time = body.data.reservationTime;
    const withinHours =
      hours &&
      !hours.closed &&
      (hours.close > hours.open
        ? time >= hours.open && time < hours.close
        : time >= hours.open || time < hours.close);
    if (!withinHours) {
      return NextResponse.json(
        { error: "Seçtiğin saatte mekân kapalı." },
        { status: 409 },
      );
    }
  }

  const email = body.data.email.toLowerCase();
  const duplicate = await prisma.reservation.findFirst({
    where: {
      venueId: venue.id,
      email,
      reservationDate: body.data.reservationDate,
      reservationTime: body.data.reservationTime,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "Bu tarih ve saat için rezervasyon talebin zaten var." },
      { status: 409 },
    );
  }

  await prisma.reservation.create({
    data: {
      venueId: venue.id,
      fullName: body.data.fullName,
      email,
      phone: body.data.phone,
      guestCount: body.data.guestCount,
      reservationDate: body.data.reservationDate,
      reservationTime: body.data.reservationTime,
      note: body.data.note || null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
