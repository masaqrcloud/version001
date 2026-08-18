import { NextResponse } from "next/server";
import { lanOrigin, lanOrigins } from "@/lib/public-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const port = url.port || (url.protocol === "https:" ? "443" : "3000");
  const origins = lanOrigins(port);
  const live = lanOrigin(port);

  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const current = `${proto}://${host}`;
    return NextResponse.json({
      origin: current,
      origins: [current, ...origins.filter((item) => item !== current)],
    });
  }

  return NextResponse.json({ origin: live, origins });
}
