import { NextResponse } from "next/server";
import { getCustomerFromCookie, isGoogleAuthConfigured } from "@/lib/customer";
import { prisma } from "@/lib/db";

export async function GET() {
  const googleAuth = isGoogleAuthConfigured();
  const customer = await getCustomerFromCookie();
  if (!customer) {
    return NextResponse.json({ linked: false, googleAuth });
  }

  const guests = await prisma.guest.findMany({
    where: { customerId: customer.id },
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        include: {
          items: { select: { name: true, quantity: true, price: true } },
        },
      },
      tableSession: {
        include: {
          table: {
            include: {
              venue: {
                select: { id: true, name: true, logoUrl: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const venues = new Map<
    string,
    {
      venueId: string;
      venueName: string;
      logoUrl: string | null;
      visits: {
        sessionId: string;
        tableNumber: string;
        openedAt: string;
        closedAt: string | null;
        orders: {
          id: string;
          createdAt: string;
          items: { name: string; quantity: number; price: number }[];
        }[];
      }[];
    }
  >();

  for (const guest of guests) {
    if (!guest.orders.length) continue;
    const venue = guest.tableSession.table.venue;
    const current = venues.get(venue.id) ?? {
      venueId: venue.id,
      venueName: venue.name,
      logoUrl: venue.logoUrl,
      visits: [],
    };
    let visit = current.visits.find(
      (item) => item.sessionId === guest.tableSessionId,
    );
    if (!visit) {
      visit = {
        sessionId: guest.tableSessionId,
        tableNumber: guest.tableSession.table.number,
        openedAt: guest.tableSession.openedAt.toISOString(),
        closedAt: guest.tableSession.closedAt?.toISOString() ?? null,
        orders: [],
      };
      current.visits.push(visit);
    }
    visit.orders.push(
      ...guest.orders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
        })),
      })),
    );
    venues.set(venue.id, current);
  }

  const grouped = [...venues.values()].map((venue) => ({
    ...venue,
    visits: venue.visits.sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
  }));

  return NextResponse.json({
    linked: true,
    googleAuth,
    customer: { name: customer.name, email: customer.email },
    venues: grouped,
  });
}
