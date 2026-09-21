import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/tenant";
import { venueSummary } from "@/lib/venue-summary";

export async function GET(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 400 });
  }

  const requestedDays = Number(new URL(request.url).searchParams.get("days"));
  const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 1;

  return NextResponse.json(await venueSummary(user.venueId, days));
}
