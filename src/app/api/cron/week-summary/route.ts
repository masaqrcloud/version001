import { NextResponse } from "next/server";
import { sendAllVenueWeekSummaryMails } from "@/lib/venue-summary-mail";

function authorized(request: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const results = await sendAllVenueWeekSummaryMails();
  return NextResponse.json({
    ok: true,
    venues: results.length,
    sent: results.reduce((sum, item) => sum + item.sent, 0),
    results,
  });
}
