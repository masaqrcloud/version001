import { prisma } from "@/lib/db";

/** OWNER/ADMIN (+ opsiyonel reportEmail). Rapor kapalı olsa da döner. */
export async function venueStaffEmails(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { name: true, reportEmail: true },
  });
  if (!venue) return { venue: null, emails: [] as string[] };

  const staff = await prisma.user.findMany({
    where: { venueId, role: { in: ["OWNER", "ADMIN"] } },
    select: { email: true },
  });
  const emails = new Set<string>();
  if (venue.reportEmail?.trim()) emails.add(venue.reportEmail.trim());
  for (const member of staff) emails.add(member.email);
  return { venue, emails: [...emails] };
}
