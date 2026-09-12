import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Önce bir mekan seç" }, { status: 400 });
  }

  const { id } = await params;
  const member = await prisma.venueMember.findFirst({
    where: { id, venueId: user.venueId },
  });
  if (!member) {
    return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });
  }
  if (member.unlinkedAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.venueMember.update({
    where: { id: member.id },
    data: { unlinkedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
