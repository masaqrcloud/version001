import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseOpeningHours } from "@/lib/opening-hours";
import {
  istanbulToday,
  reservationTimesOverlap,
} from "@/lib/reservation-occupancy";

const schema = z.object({
  venueId: z.string().min(1),
  tableId: z.string().min(1),
  fullName: z.string().trim().min(3).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(7).max(24),
  guestCount: z.number().int().min(1).max(30),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservationTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(400).optional(),
  website: z.string().max(0).optional(),
});

async function busyTableIds(
  venueId: string,
  date?: string,
  time?: string,
) {
  const reservedIds = new Set<string>();
  const occupiedIds = new Set<string>();

  if (date) {
    const reservations = await prisma.reservation.findMany({
      where: {
        venueId,
        reservationDate: date,
        tableId: { not: null },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { tableId: true, reservationTime: true },
    });
    for (const item of reservations) {
      if (!item.tableId) continue;
      if (!time || reservationTimesOverlap(item.reservationTime, time)) {
        reservedIds.add(item.tableId);
      }
    }
  }

  if (date === istanbulToday()) {
    const open = await prisma.tableSession.findMany({
      where: { status: "OPEN", table: { venueId } },
      select: {
        tableId: true,
        mergedTables: { select: { id: true } },
      },
    });
    for (const session of open) {
      occupiedIds.add(session.tableId);
      for (const extra of session.mergedTables) occupiedIds.add(extra.id);
    }
  }

  return { reservedIds, occupiedIds };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const parsed = z
    .object({
      venueId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })
    .safeParse({
      venueId: query.get("venueId"),
      date: query.get("date") || undefined,
      time: query.get("time") || undefined,
    });
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz mekân" }, { status: 400 });
  }

  const [tables, busy] = await Promise.all([
    prisma.table.findMany({
      where: { venueId: parsed.data.venueId },
      select: { id: true, number: true, floorX: true, floorY: true },
      orderBy: { number: "asc" },
    }),
    busyTableIds(
      parsed.data.venueId,
      parsed.data.date,
      parsed.data.time,
    ),
  ]);

  return NextResponse.json({
    tables: tables.map((table) => {
      const occupied = busy.occupiedIds.has(table.id);
      const reserved = busy.reservedIds.has(table.id);
      return {
        ...table,
        available: !occupied && !reserved,
        occupied,
        reserved,
      };
    }),
  });
}

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

  try {
    await prisma.$transaction(async (tx) => {
      const table = await tx.table.findFirst({
        where: { id: body.data.tableId, venueId: venue.id },
      });
      if (!table) throw new Error("TABLE_NOT_FOUND");

      const busy = await busyTableIds(
        venue.id,
        body.data.reservationDate,
        body.data.reservationTime,
      );
      if (busy.occupiedIds.has(table.id)) throw new Error("TABLE_OCCUPIED");
      if (busy.reservedIds.has(table.id)) throw new Error("TABLE_RESERVED");

      await tx.reservation.create({
        data: {
          venueId: venue.id,
          tableId: table.id,
          fullName: body.data.fullName,
          email,
          phone: body.data.phone,
          guestCount: body.data.guestCount,
          reservationDate: body.data.reservationDate,
          reservationTime: body.data.reservationTime,
          note: body.data.note || null,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["TABLE_NOT_FOUND", "TABLE_RESERVED", "TABLE_OCCUPIED"].includes(
        error.message,
      )
    ) {
      return NextResponse.json(
        {
          error:
            error.message === "TABLE_OCCUPIED"
              ? "Bu masa şu an dolu. Lütfen başka bir masa seç."
              : error.message === "TABLE_RESERVED"
                ? "Bu masa o saatte rezerve. Lütfen başka bir masa seç."
                : "Seçilen masa bulunamadı.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
