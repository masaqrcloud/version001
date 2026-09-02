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
    { startNew: Boolean(body?.startNew) },
  );
  if (!joined) {
    return NextResponse.json({ error: "Masa bulunamadı" }, { status: 404 });
  }

  if (joined.closed) {
    const payload = {
      closed: true as const,
      tableNumber: joined.table.number,
      venueName: joined.venue.name,
      guestId: joined.guest?.id ?? null,
      guestToken: joined.guest?.guestToken ?? null,
      nickname: joined.guest?.nickname ?? null,
    };
    if (!joined.guest) {
      return NextResponse.json(payload);
    }
    return applyGuestCookie(NextResponse.json(payload), joined.guest.guestToken);
  }

  return applyGuestCookie(
    NextResponse.json({
      closed: false as const,
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

  const joined = await joinTable(qr);
  if (!joined) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const redirect = NextResponse.redirect(new URL(`/t/${qr}`, request.url));
  if (!joined.guest) {
    return redirect;
  }

  return applyGuestCookie(redirect, joined.guest.guestToken);
}
