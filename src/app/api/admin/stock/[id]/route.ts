import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyAdminStockChange } from "@/lib/stock";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("track"),
    quantity: z.number().int().min(0).max(100000),
    threshold: z.number().int().min(0).max(100000).optional(),
  }),
  z.object({ action: z.literal("untrack") }),
  z.object({
    action: z.literal("set"),
    quantity: z.number().int().min(0).max(100000),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("adjust"),
    delta: z.number().int().min(-100000).max(100000),
    reason: z.enum(["RECEIVE", "WASTE", "ADJUST"]),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({
    action: z.literal("threshold"),
    lowStockThreshold: z.number().int().min(0).max(100000),
  }),
]);

export async function PATCH(request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN"]);
  if (error) return error;
  if (!user.venueId) {
    return NextResponse.json({ error: "Mekan yok" }, { status: 400 });
  }

  const { id } = await context.params;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Geçersiz stok işlemi" }, { status: 400 });
  }
  if (body.data.action === "adjust" && body.data.delta === 0) {
    return NextResponse.json({ error: "Miktar 0 olamaz" }, { status: 400 });
  }

  try {
    const item = await prisma.$transaction((tx) =>
      applyAdminStockChange(tx, {
        venueId: user.venueId,
        menuItemId: id,
        actorId: user.id,
        action:
          body.data.action === "track"
            ? {
                type: "track",
                quantity: body.data.quantity,
                threshold: body.data.threshold,
              }
            : body.data.action === "untrack"
              ? { type: "untrack" }
              : body.data.action === "set"
                ? {
                    type: "set",
                    quantity: body.data.quantity,
                    note: body.data.note,
                  }
                : body.data.action === "adjust"
                  ? {
                      type: "adjust",
                      delta: body.data.delta,
                      reason: body.data.reason,
                      note: body.data.note,
                    }
                  : {
                      type: "threshold",
                      lowStockThreshold: body.data.lowStockThreshold,
                    },
      }),
    );
    return NextResponse.json({
      id: item.id,
      stockTracked: item.stockTracked,
      stockQuantity: item.stockQuantity,
      lowStockThreshold: item.lowStockThreshold,
    });
  } catch (stockError) {
    if (stockError instanceof Error && stockError.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }
    if (stockError instanceof Error && stockError.message === "NOT_TRACKED") {
      return NextResponse.json(
        { error: "Önce bu ürün için stok takibini aç" },
        { status: 409 },
      );
    }
    if (stockError instanceof Error && stockError.message === "NEGATIVE_STOCK") {
      return NextResponse.json(
        { error: "Stok sıfırın altına inemez" },
        { status: 409 },
      );
    }
    throw stockError;
  }
}
