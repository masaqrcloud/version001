import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findTable, removeInactiveStaffGuests } from "@/lib/guest";
import { GuestApp } from "@/app/t/[qrToken]/guest-app";
import { venueOpenState } from "@/lib/opening-hours";

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ qrToken: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { qrToken } = await params;
  const query = await searchParams;
  const table = await findTable(qrToken);
  if (!table) {
    notFound();
  }

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: table.venueId },
    include: {
      items: {
        where: { available: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const session = await auth();
  const openState = venueOpenState(table.venue.openingHours);
  const staffPreview = Boolean(session?.user?.id) && query.preview === "1";
  if (staffPreview) {
    await removeInactiveStaffGuests(table.id);
  }

  return (
    <GuestApp
      qrToken={qrToken}
      venueName={table.venue.name}
      venueTagline={table.venue.tagline}
      venueLogo={table.venue.logoUrl}
      venueCover={table.venue.coverUrl}
      tableNumber={table.number}
      staffPreview={staffPreview}
      openState={{ isOpen: openState.isOpen, label: openState.label }}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        items: category.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          imageUrl: item.imageUrl,
          soldOut: item.stockTracked && item.stockQuantity <= 0,
        })),
      }))}
    />
  );
}
