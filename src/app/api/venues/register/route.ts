import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Yeni mekânlar başvuru sonrasında MasaQR ekibi tarafından açılır." },
    { status: 410 },
  );
}
