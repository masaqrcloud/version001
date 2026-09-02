import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/tenant";

export async function GET(request: Request) {
  const { error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MasaQR/1.0 (masaqr.cloud@gmail.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ suggestions: [] });
  }

  const results = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  }[];

  const suggestions = results
    .map((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        latitude,
        longitude,
        address: item.display_name ?? query,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return NextResponse.json({ suggestions });
}
