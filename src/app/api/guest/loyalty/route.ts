import { NextResponse } from "next/server";
import { getCustomerFromCookie, isGoogleAuthConfigured } from "@/lib/customer";
import { findTable } from "@/lib/guest";
import { countLoyaltyQuantity, punchCard } from "@/lib/loyalty";
import { prisma } from "@/lib/db";

function itemName(locale: string, name: string, nameEn: string | null) {
  return locale === "en" && nameEn ? nameEn : name;
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
    const item = table.venue.loyaltyItemId
      ? await prisma.menuItem.findUnique({
          where: { id: table.venue.loyaltyItemId },
          select: { id: true, name: true, nameEn: true, imageUrl: true },
        })
      : null;
    if (!customer) {
      return NextResponse.json({
        linked: false,
        googleAuth,
        venues: [
          {
            venueId: table.venue.id,
            venueName: table.venue.name,
            logoUrl: table.venue.logoUrl,
            enabled: Boolean(item),
            item: item
              ? {
                  id: item.id,
                  name: itemName(locale, item.name, item.nameEn),
                  imageUrl: item.imageUrl,
                }
              : null,
            ...punchCard(0),
          },
        ],
      });
    }
    const count = item
      ? await countLoyaltyQuantity(customer.id, table.venue.id, item.id)
      : 0;
    return NextResponse.json({
      linked: true,
      googleAuth,
      venues: [
        {
          venueId: table.venue.id,
          venueName: table.venue.name,
          logoUrl: table.venue.logoUrl,
          enabled: Boolean(item),
          item: item
            ? {
                id: item.id,
                name: itemName(locale, item.name, item.nameEn),
                imageUrl: item.imageUrl,
              }
            : null,
          ...punchCard(count),
        },
      ],
    });
  }

  if (!customer) {
    return NextResponse.json({ linked: false, googleAuth, venues: [] });
  }

  const members = await prisma.venueMember.findMany({
    where: { customerId: customer.id, unlinkedAt: null },
    include: {
      venue: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          loyaltyItemId: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const venues = [];
  for (const member of members) {
    const item = member.venue.loyaltyItemId
      ? await prisma.menuItem.findUnique({
          where: { id: member.venue.loyaltyItemId },
          select: { id: true, name: true, nameEn: true, imageUrl: true },
        })
      : null;
    const count = item
      ? await countLoyaltyQuantity(customer.id, member.venue.id, item.id)
      : 0;
    venues.push({
      venueId: member.venue.id,
      venueName: member.venue.name,
      logoUrl: member.venue.logoUrl,
      enabled: Boolean(item),
      item: item
        ? {
            id: item.id,
            name: itemName(locale, item.name, item.nameEn),
            imageUrl: item.imageUrl,
          }
        : null,
      ...punchCard(count),
    });
  }

  return NextResponse.json({ linked: true, googleAuth, venues });
}
