import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  GUEST_COOKIE,
  findTable,
  guestCookieOptions,
  joinTable,
  removeInactiveStaffGuests,
  signedGuestCookie,
} from "@/lib/guest";

function applyGuestCookie(response: NextResponse, guestToken: string) {
  response.cookies.set(
    GUEST_COOKIE,
    signedGuestCookie(guestToken),
    guestCookieOptions(),
  );
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    qr?: string;
    guestToken?: string;
    preview?: boolean;
    startNew?: boolean;
    sit?: boolean;
    nickname?: string;
  } | null;
  const qr = body?.qr?.trim();
  if (!qr) {
    return NextResponse.json({ error: "QR eksik" }, { status: 400 });
  }

  const staff = await auth();
  if (body?.preview && staff?.user?.id) {
    const table = await findTable(qr);
    if (!table) {
      return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
    }
    await removeInactiveStaffGuests(table.id);
    return NextResponse.json({ staffPreview: true });
  }

  const joined = await joinTable(
    qr,
    body?.startNew ? null : body?.guestToken,
    {
      startNew: Boolean(body?.startNew),
      sit: Boolean(body?.sit),
      nickname: body?.nickname,
    },
  );
  if (!joined) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  if (joined.idle) {
    return NextResponse.json({
      idle: true,
      closed: false,
      tableNumber: joined.table.number,
      venueName: joined.venue.name,
    });
  }

  if (joined.closed) {
    const payload = {
      closed: true as const,
      canStartNew: Boolean(joined.canStartNew),
      tableNumber: joined.table.number,
      venueName: joined.venue.name,
      guestId: joined.guest?.id ?? null,
      guestToken: joined.guest?.guestToken ?? null,
      nickname: joined.guest?.nickname ?? null,
      error: joined.canStartNew
        ? undefined
        : "Masa boş. Yeni sipariş için garson krokide masayı açmalı.",
    };
    if (body?.startNew) {
      return NextResponse.json(payload, { status: 409 });
    }
    if (!joined.guest) {
      return NextResponse.json(payload);
    }
    return applyGuestCookie(NextResponse.json(payload), joined.guest.guestToken);
  }

  if (!joined.guest) {
    return NextResponse.json({ error: "Masaya bağlanılamadı" }, { status: 500 });
  }

  return applyGuestCookie(
    NextResponse.json({
      closed: false as const,
      idle: false as const,
      guestId: joined.guest.id,
      guestToken: joined.guest.guestToken,
      nickname: joined.guest.nickname,
      tableNumber: joined.table.number,
      venueName: joined.venue.name,
    }),
    joined.guest.guestToken,
  );
}

export async function GET(request: Request) {
  const qr = new URL(request.url).searchParams.get("qr");
  if (!qr) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const table = await findTable(qr);
  if (!table) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL(`/t/${qr}`, request.url));
}
