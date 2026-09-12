import { NextResponse } from "next/server";
import { z } from "zod";
import { findTable } from "@/lib/guest";
import { backfillVenueEnglish } from "@/lib/translate-menu";

export async function POST(request: Request) {
  const body = z
    .object({ qrToken: z.string().min(1).max(200) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const table = await findTable(body.data.qrToken);
  if (!table) {
    return NextResponse.json({ error: "Masa yok" }, { status: 404 });
  }

  const english = await backfillVenueEnglish(table.venueId);
  return NextResponse.json(english);
}
