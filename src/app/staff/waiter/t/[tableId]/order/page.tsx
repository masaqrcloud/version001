import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { sittingIsOccupied } from "@/lib/media";
import { getStaffUser } from "@/lib/tenant";
import { WaiterOrderForm } from "@/app/staff/waiter/[sessionId]/order/waiter-order-form";
import { loadWaiterMenu } from "@/app/staff/waiter/waiter-menu";

export default async function WaiterTableOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error || !user) redirect("/login");

  const { tableId } = await params;
  const table = await prisma.table.findFirst({
    where: { id: tableId, venueId: user.venueId },
    include: {
      sessions: {
        where: { status: "OPEN" },
        orderBy: { openedAt: "asc" },
        include: {
          guests: { select: { nickname: true } },
          orders: {
            where: { status: { not: "CANCELLED" } },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!table) notFound();

  const open = table.sessions[0];
  if (open && sittingIsOccupied(open.guests, open.orders.length)) {
    redirect(`/staff/waiter/${open.id}/order`);
  }

  return (
    <WaiterOrderForm
      tableId={table.id}
      tableNumber={table.number}
      categories={await loadWaiterMenu(user.venueId)}
    />
  );
}
