import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { WaiterOrderForm } from "@/app/staff/waiter/[sessionId]/order/waiter-order-form";
import { formatTableGroup } from "@/lib/table-groups";

export default async function WaiterOrderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error || !user) redirect("/login");

  const { sessionId } = await params;
  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, table: { venueId: user.venueId } },
    include: { table: true, mergedTables: true },
  });
  if (!tableSession) notFound();

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: tableSession.table.venueId },
    include: {
      items: {
        where: { available: true },
        orderBy: { sortOrder: "asc" },
        include: {
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            include: {
              options: {
                where: { available: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <WaiterOrderForm
      sessionId={tableSession.id}
      tableNumber={formatTableGroup(
        tableSession.table.number,
        tableSession.mergedTables.map((table) => table.number),
      )}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        items: category.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          soldOut: item.stockTracked && item.stockQuantity <= 0,
          optionGroups: item.optionGroups.map((group) => ({
            id: group.id,
            name: group.name,
            required: group.required,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            options: group.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: Number(option.priceDelta),
            })),
          })),
        })),
      }))}
    />
  );
}
