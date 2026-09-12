import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE,
  CUSTOMER_OAUTH_COOKIE,
  attachCustomerToGuest,
  customerCookieOptions,
  googleCallbackUrl,
  publicUrl,
  googleClientId,
  googleClientSecret,
  isGoogleAuthConfigured,
  readOAuthState,
  signedCustomerCookie,
  upsertCustomerFromGoogle,
} from "@/lib/customer";
import {
  GUEST_COOKIE,
  guestCookieOptions,
  joinTable,
  signedGuestCookie,
} from "@/lib/guest";

function fail(request: Request, qr: string | null, reason: string) {
  const path = qr ? `/t/${qr}?google=${reason}` : `/login?google=${reason}`;
  const response = NextResponse.redirect(publicUrl(path, request));
  response.cookies.set(CUSTOMER_OAUTH_COOKIE, "", customerCookieOptions(0));
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = readOAuthState(url.searchParams.get("state") ?? undefined);
  const code = url.searchParams.get("code");
  const qr = state?.qr ?? null;

  if (!isGoogleAuthConfigured()) {
    return fail(request, qr, "off");
  }
  if (!state || !code) {
    return fail(request, qr, "error");
  }

  const store = await cookies();
  const storeNonce = store.get(CUSTOMER_OAUTH_COOKIE)?.value ?? "";
  if (!storeNonce || storeNonce !== state.nonce) {
    return fail(request, qr, "error");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: googleCallbackUrl(request),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as {
    access_token?: string;
  } | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return fail(request, qr, "error");
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  );
  const profile = (await profileRes.json().catch(() => null)) as {
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  } | null;
  if (!profileRes.ok || !profile?.sub || !profile.email) {
    return fail(request, qr, "error");
  }

  const customer = await upsertCustomerFromGoogle({
    sub: profile.sub,
    email: profile.email,
    name: profile.name,
  });

  if (!state.qr) {
    const response = NextResponse.redirect(publicUrl("/hesabim", request));
    response.cookies.set(
      CUSTOMER_COOKIE,
      signedCustomerCookie(customer.id),
      customerCookieOptions(),
    );
    response.cookies.set(CUSTOMER_OAUTH_COOKIE, "", customerCookieOptions(0));
    return response;
  }

  const joined = await joinTable(state.qr, null, {
    sit: true,
    nickname: customer.name,
  });
  if (!joined?.guest || joined.idle || joined.closed) {
    return fail(request, state.qr, "error");
  }

  const guest = await attachCustomerToGuest(joined.guest, joined.table.venueId, {
    explicit: true,
    customer,
  });

  const response = NextResponse.redirect(
    publicUrl(`/t/${state.qr}`, request),
  );
  response.cookies.set(
    CUSTOMER_COOKIE,
    signedCustomerCookie(customer.id),
    customerCookieOptions(),
  );
  response.cookies.set(
    GUEST_COOKIE,
    signedGuestCookie(guest.guestToken),
    guestCookieOptions(),
  );
  response.cookies.set(CUSTOMER_OAUTH_COOKIE, "", customerCookieOptions(0));
  return response;
}
