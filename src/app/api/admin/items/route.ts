import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { isPublicImageUrl } from "@/lib/media";

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
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ ...item, price: Number(item.price) });
}
