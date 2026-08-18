import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url gerekli" }, { status: 400 });
  }

  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    color: { dark: "#1f1a14", light: "#fffdf8" },
  });

  return NextResponse.json({ qrDataUrl, url });
}
