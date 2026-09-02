import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { isPublicImageUrl } from "@/lib/media";
import { menuOptionGroupInputSchema } from "@/lib/menu-option-schema";
import { nutritionFieldsSchema } from "@/lib/nutrition";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  const body = z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      description: z.string().max(200).nullable().optional(),
      price: z.number().positive().optional(),
      imageUrl: z.string().nullable().optional().or(z.literal("")),
      available: z.boolean().optional(),
      stockTracked: z.boolean().optional(),
      stockQuantity: z.number().int().min(0).max(100000).optional(),
      lowStockThreshold: z.number().int().min(0).max(100000).optional(),
      categoryId: z.string().optional(),
      optionGroups: z.array(menuOptionGroupInputSchema).max(20).optional(),
      allergens: nutritionFieldsSchema.shape.allergens,
      animalSource: nutritionFieldsSchema.shape.animalSource,
      containsAlcohol: nutritionFieldsSchema.shape.containsAlcohol,
      containsPork: nutritionFieldsSchema.shape.containsPork,
      calories: nutritionFieldsSchema.shape.calories,
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz ürün" }, { status: 400 });
  }

  const existing = await prisma.menuItem.findFirst({
    where: { id, category: { venueId: user.venueId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ürün yok" }, { status: 404 });
  }

  if (body.data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: body.data.categoryId, venueId: user.venueId },
    });
    if (!category) {
      return NextResponse.json({ error: "Kategori yok" }, { status: 404 });
    }
  }

  const { optionGroups, ...itemData } = body.data;
  const item = await prisma.$transaction(async (tx) => {
    if (optionGroups !== undefined) {
      await tx.cartItem.deleteMany({ where: { menuItemId: id } });
      await tx.menuOptionGroup.deleteMany({ where: { menuItemId: id } });
    }

    return tx.menuItem.update({
      where: { id },
      data: {
        ...itemData,
        imageUrl:
          body.data.imageUrl === "" || body.data.imageUrl === null
            ? null
            : body.data.imageUrl && isPublicImageUrl(body.data.imageUrl)
              ? body.data.imageUrl
              : existing.imageUrl,
        optionGroups:
          optionGroups === undefined
            ? undefined
            : {
                create: optionGroups.map((group, groupIndex) => ({
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
              },
      },
      include: {
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
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

export async function DELETE(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.menuItem.findFirst({
    where: { id, category: { venueId: user.venueId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ürün yok" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
