import { NextResponse } from "next/server";
import { getCustomerFromCookie, isGoogleAuthConfigured } from "@/lib/customer";
import { findTable } from "@/lib/guest";
import { customerVenueLoyalty, punchCard } from "@/lib/loyalty";
import { prisma } from "@/lib/db";

function itemName(locale: string, name: string, nameEn: string | null) {
  return locale === "en" && nameEn ? nameEn : name;
}

function packItem(
  locale: string,
  item: { id: string; name: string; nameEn: string | null; imageUrl: string | null } | null,
) {
  if (!item) return null;
  return {
    id: item.id,
    name: itemName(locale, item.name, item.nameEn),
    imageUrl: item.imageUrl,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qr = url.searchParams.get("qr")?.trim() ?? "";
  const locale = url.searchParams.get("locale")?.trim() ?? "tr";
  const googleAuth = isGoogleAuthConfigured();
  const customer = await getCustomerFromCookie();

  if (qr) {
    const table = await findTable(qr);
    if (!table) {
      return NextResponse.json({ error: "Masa yok" }, { status: 404 });
    }
    if (!customer) {
      const item = table.venue.loyaltyItemId
        ? await prisma.menuItem.findUnique({
            where: { id: table.venue.loyaltyItemId },
            select: { id: true, name: true, nameEn: true, imageUrl: true },
          })
        : null;
      return NextResponse.json({
        linked: false,
        googleAuth,
        venues: [
          {
            venueId: table.venue.id,
            venueName: table.venue.name,
            logoUrl: table.venue.logoUrl,
            enabled: Boolean(item),
            item: packItem(locale, item),
            ...punchCard(0),
          },
        ],
      });
    }
    const loyalty = await customerVenueLoyalty(customer.id, table.venue.id);
    return NextResponse.json({
      linked: true,
      googleAuth,
      venues: [
        {
          venueId: table.venue.id,
          venueName: table.venue.name,
          logoUrl: table.venue.logoUrl,
          enabled: Boolean(loyalty.item),
          item: packItem(locale, loyalty.item),
          count: loyalty.count,
          redeemed: loyalty.redeemed,
          earned: loyalty.earned,
          available: loyalty.available,
          rewards: loyalty.available,
          filled: loyalty.filled,
          complete: loyalty.complete,
          threshold: loyalty.threshold,
        },
      ],
    });
  }

  if (!customer) {
    return NextResponse.json({ linked: false, googleAuth, venues: [] });
  }

  const members = await prisma.venueMember.findMany({
    where: { customerId: customer.id, unlinkedAt: null },
    orderBy: { joinedAt: "desc" },
  });

  const venues = [];
  for (const member of members) {
    const loyalty = await customerVenueLoyalty(customer.id, member.venueId);
    if (!loyalty.venue) continue;
    venues.push({
      venueId: loyalty.venue.id,
      venueName: loyalty.venue.name,
      logoUrl: loyalty.venue.logoUrl,
      enabled: Boolean(loyalty.item),
      item: packItem(locale, loyalty.item),
      count: loyalty.count,
      redeemed: loyalty.redeemed,
      earned: loyalty.earned,
      available: loyalty.available,
      rewards: loyalty.available,
      filled: loyalty.filled,
      complete: loyalty.complete,
      threshold: loyalty.threshold,
    });
  }

  return NextResponse.json({ linked: true, googleAuth, venues });
}
