import { prisma } from "@/lib/db";

export async function loadWaiterMenu(venueId: string) {
  const categories = await prisma.menuCategory.findMany({
    where: { venueId },
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

  return categories.map((category) => ({
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
  }));
}
