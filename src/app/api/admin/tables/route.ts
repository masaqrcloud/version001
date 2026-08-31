import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const tables = await prisma.table.findMany({
    where: { venueId: user.venueId },
    include: {
      sessions: {
        where: { status: "OPEN" },
        include: { _count: { select: { guests: true, orders: true } } },
      },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json({ tables });
}

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const body = z
    .object({ number: z.string().trim().min(1).max(40) })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Masa numarası gerekli" }, { status: 400 });
  }

  try {
    const table = await prisma.table.create({
      data: { venueId: user.venueId, number: body.data.number },
    });
    return NextResponse.json(table);
  } catch {
    return NextResponse.json(
      { error: "Bu masa numarası zaten var" },
      { status: 409 },
    );
  }
}
