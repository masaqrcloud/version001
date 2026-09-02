import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/tenant";
import { asCoord, isGoogleMapsLink, parseGoogleMapsCoords } from "@/lib/maps";
import {
  resolveGoogleMapsLink,
  reverseGeocode,
  searchLocations,
} from "@/lib/google-places";

export async function GET(request: Request) {
  const { error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const latitude = asCoord(params.get("lat"));
  const longitude = asCoord(params.get("lng"));
  if (latitude != null && longitude != null) {
    const address = await reverseGeocode(latitude, longitude);
    return NextResponse.json({
      address,
      suggestions: address
        ? [{ latitude, longitude, address }]
        : [],
    });
  }

  const query = params.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  if (
    isGoogleMapsLink(query) ||
    parseGoogleMapsCoords(query) ||
    /@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/.test(query)
  ) {
    const resolved = await resolveGoogleMapsLink(query);
    if (resolved) {
      return NextResponse.json({ suggestions: [resolved] });
    }
  }

  const pair = query.match(
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  );
  if (pair) {
    const latitude = Number(pair[1]);
    const longitude = Number(pair[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const address = (await reverseGeocode(latitude, longitude)) ?? query;
      return NextResponse.json({
        suggestions: [{ latitude, longitude, address }],
      });
    }
  }

  const suggestions = await searchLocations(query);
  return NextResponse.json({ suggestions });
}
