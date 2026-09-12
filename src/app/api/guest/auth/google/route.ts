import { NextResponse } from "next/server";
import {
  CUSTOMER_OAUTH_COOKIE,
  createOAuthState,
  customerCookieOptions,
  googleCallbackUrl,
  publicUrl,
  googleClientId,
  isGoogleAuthConfigured,
} from "@/lib/customer";
import { findTable } from "@/lib/guest";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qr = url.searchParams.get("qr")?.trim() ?? "";

  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      publicUrl(qr ? `/t/${qr}?google=off` : "/login?google=off", request),
    );
  }

  if (qr) {
    const table = await findTable(qr);
    if (!table) {
      return NextResponse.redirect(publicUrl("/", request));
    }
  }

  const { state, nonce } = createOAuthState(qr || null);
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.searchParams.set("client_id", googleClientId());
  google.searchParams.set("redirect_uri", googleCallbackUrl(request));
  google.searchParams.set("response_type", "code");
  google.searchParams.set("scope", "openid email profile");
  google.searchParams.set("state", state);
  google.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(google);
  response.cookies.set(
    CUSTOMER_OAUTH_COOKIE,
    nonce,
    customerCookieOptions(10 * 60),
  );
  return response;
}
