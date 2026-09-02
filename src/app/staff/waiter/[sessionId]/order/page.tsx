import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { WaiterOrderForm } from "@/app/staff/waiter/[sessionId]/order/waiter-order-form";
import { formatTableGroup } from "@/lib/table-groups";

export default async function WaiterOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error || !user) redirect("/login");

  const { sessionId } = await params;
  const { orderId } = await searchParams;
  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, table: { venueId: user.venueId } },
    include: { table: true, mergedTables: true },
  });
  if (!tableSession) notFound();

  const editOrder = orderId
    ? await prisma.order.findFirst({
        where: {
          id: orderId,
          tableSessionId: tableSession.id,
        },
        include: {
          items: { include: { options: true, menuItem: { include: { optionGroups: { include: { options: true } } } } } },
        },
      })
    : null;
  if (orderId && !editOrder) notFound();
  if (editOrder && editOrder.status !== "PENDING") {
    redirect(`/staff/waiter/${sessionId}`);
  }

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

  function optionIdsFor(item: NonNullable<typeof editOrder>["items"][number]) {
    const remaining = item.options.map((option) => option.name);
    const ids: string[] = [];
    for (const group of item.menuItem.optionGroups) {
      for (const option of group.options) {
        const index = remaining.indexOf(option.name);
        if (index >= 0) {
          ids.push(option.id);
          remaining.splice(index, 1);
        }
      }
    }
    return ids;
  }

  return (
    <WaiterOrderForm
      sessionId={tableSession.id}
      tableNumber={formatTableGroup(
        tableSession.table.number,
        tableSession.mergedTables.map((table) => table.number),
      )}
      editOrder={
        editOrder
          ? {
              id: editOrder.id,
              items: editOrder.items.map((item) => ({
                menuItemId: item.menuItemId,
                name: item.name,
                price: Number(item.price),
                quantity: item.quantity,
                note: item.note,
                optionIds: optionIdsFor(item),
                optionNames: item.options.map((option) => option.name),
              })),
            }
          : undefined
      }
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
