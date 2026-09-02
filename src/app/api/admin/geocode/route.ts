import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/tenant";

export async function GET(request: Request) {
  const { error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ error: "Adres yaz" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MasaQR/1.0 (masaqr.cloud@gmail.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Konum bulunamadı" }, { status: 502 });
  }

  const results = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  }[];
  const hit = results[0];
  const latitude = Number(hit?.lat);
  const longitude = Number(hit?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Bu adres haritada yok" }, { status: 404 });
  }

  return NextResponse.json({
    latitude,
    longitude,
    address: hit.display_name ?? query,
  });
}
