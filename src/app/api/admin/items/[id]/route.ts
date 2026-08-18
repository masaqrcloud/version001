import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { isPublicImageUrl } from "@/lib/media";

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

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...body.data,
      imageUrl:
        body.data.imageUrl === "" || body.data.imageUrl === null
          ? null
          : body.data.imageUrl && isPublicImageUrl(body.data.imageUrl)
            ? body.data.imageUrl
            : existing.imageUrl,
    },
  });

  return NextResponse.json({ ...item, price: Number(item.price) });
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
