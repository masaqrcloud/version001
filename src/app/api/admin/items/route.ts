import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { isPublicImageUrl } from "@/lib/media";
import { menuOptionGroupInputSchema } from "@/lib/menu-option-schema";
import { nutritionFieldsSchema } from "@/lib/nutrition";

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const body = z
    .object({
      categoryId: z.string().min(1),
      name: z.string().trim().min(1).max(80),
      description: z.string().max(200).optional(),
      price: z.number().positive(),
      imageUrl: z.string().optional().or(z.literal("")),
      available: z.boolean().optional(),
      stockTracked: z.boolean().optional(),
      stockQuantity: z.number().int().min(0).max(100000).optional(),
      lowStockThreshold: z.number().int().min(0).max(100000).optional(),
      optionGroups: z.array(menuOptionGroupInputSchema).max(20).optional(),
      allergens: nutritionFieldsSchema.shape.allergens,
      animalSource: nutritionFieldsSchema.shape.animalSource,
      containsAlcohol: nutritionFieldsSchema.shape.containsAlcohol,
      containsPork: nutritionFieldsSchema.shape.containsPork,
      calories: z.number().int().min(0).max(99999),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz ürün" }, { status: 400 });
  }

  const category = await prisma.menuCategory.findFirst({
    where: { id: body.data.categoryId, venueId: user.venueId },
  });
  if (!category) {
    return NextResponse.json({ error: "Kategori yok" }, { status: 404 });
  }

  const last = await prisma.menuItem.findFirst({
    where: { categoryId: category.id },
    orderBy: { sortOrder: "desc" },
  });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: category.id,
      name: body.data.name,
      description: body.data.description,
      price: body.data.price,
      imageUrl:
        body.data.imageUrl && isPublicImageUrl(body.data.imageUrl)
          ? body.data.imageUrl
          : null,
      available: body.data.available ?? true,
      stockTracked: body.data.stockTracked ?? false,
      stockQuantity: body.data.stockQuantity ?? 0,
      lowStockThreshold: body.data.lowStockThreshold ?? 5,
      allergens: body.data.allergens ?? [],
      animalSource: body.data.animalSource ?? null,
      containsAlcohol: body.data.containsAlcohol ?? false,
      containsPork: body.data.containsPork ?? false,
      calories: body.data.calories,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      optionGroups: body.data.optionGroups?.length
        ? {
            create: body.data.optionGroups.map((group, groupIndex) => ({
              name: group.name,
              required: group.required ?? group.minSelections > 0,
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              sortOrder: groupIndex,
              options: {
                create: group.options.map((option, optionIndex) => ({
                  name: option.name,
                  priceDelta: option.priceDelta,
                  available: option.available ?? true,
                  sortOrder: optionIndex,
                })),
              },
            })),
          }
        : undefined,
    },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  return NextResponse.json({
    ...item,
    price: Number(item.price),
    optionGroups: item.optionGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        priceDelta: Number(option.priceDelta),
      })),
    })),
  });
}
