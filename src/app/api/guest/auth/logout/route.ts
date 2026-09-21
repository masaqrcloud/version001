import { NextResponse } from "next/server";
import { clearCustomerCookies, publicUrl } from "@/lib/customer";

export async function POST(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html") || !accept.includes("application/json")) {
    return clearCustomerCookies(
      NextResponse.redirect(publicUrl("/login", request), 303),
    );
  }
  return clearCustomerCookies(NextResponse.json({ ok: true }));
}

export async function GET(request: Request) {
  return clearCustomerCookies(
    NextResponse.redirect(publicUrl("/login", request), 303),
  );
}
