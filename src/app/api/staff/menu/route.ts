import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { nutritionFromRow } from "@/lib/nutrition";

export async function GET() {
  const { user, error } = await getStaffUser([
    "PLATFORM",
    "OWNER",
    "ADMIN",
    "WAITER",
  ]);
  if (error) return error;

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: user.venueId },
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

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        soldOut: item.stockTracked && item.stockQuantity <= 0,
        ...nutritionFromRow(item),
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
    })),
  });
}
