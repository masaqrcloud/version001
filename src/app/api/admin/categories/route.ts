import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

export async function GET() {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const categories = await prisma.menuCategory.findMany({
    where: { venueId: user.venueId },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            include: { options: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    categories: categories.map((category) => ({
      ...category,
      items: category.items.map((item) => ({
        ...item,
        price: Number(item.price),
        optionGroups: item.optionGroups.map((group) => ({
          ...group,
          options: group.options.map((option) => ({
            ...option,
            priceDelta: Number(option.priceDelta),
          })),
        })),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;

  const body = z
    .object({
      name: z.string().trim().min(1).max(60),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
  }

  const last = await prisma.menuCategory.findFirst({
    where: { venueId: user.venueId },
    orderBy: { sortOrder: "desc" },
  });

  const category = await prisma.menuCategory.create({
    data: {
      venueId: user.venueId,
      name: body.data.name,
      sortOrder: body.data.sortOrder ?? (last?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(category);
}
