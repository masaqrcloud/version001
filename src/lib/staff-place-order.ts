import { randomUUID } from "crypto";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateStaffProxyGuest } from "@/lib/guest";
import { consumeStockForOrder } from "@/lib/stock";
import { resolveStaffOrderLines, staffOrderItemSchema } from "@/lib/staff-order-lines";
import { pushToVenueRoles } from "@/lib/staff-push";
import { tableLabel } from "@/lib/table-label";

type PlaceResult =
  | { ok: true; orderId: string; status: string }
  | { ok: false; status: number; error: string };

export async function placeStaffOrder(input: {
  venueId: string;
  sessionId: string;
  tableNumber: string;
  items: z.infer<typeof staffOrderItemSchema>[];
  guestName?: string;
}): Promise<PlaceResult> {
  const resolved = await resolveStaffOrderLines(input.venueId, input.items);
  if ("error" in resolved) {
    return {
      ok: false,
      status: 409,
      error: resolved.error ?? "Sipariş yazılamadı",
    };
  }
  const { lines, stockLines } = resolved;

  const guest = await getOrCreateStaffProxyGuest(
    input.sessionId,
    input.guestName,
  );
  try {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableSessionId: input.sessionId,
          guestId: guest.id,
          guestName: guest.nickname,
          idempotencyKey: randomUUID(),
          statusEvents: { create: { toStatus: "PENDING" } },
          items: {
            create: lines.map((line) => ({
              menuItemId: line.menuItem.id,
              name: line.menuItem.name,
              price: line.price,
              quantity: line.quantity,
              note: line.note,
              options: {
                create: line.options.map((option) => ({
                  name: option.name,
                  priceDelta: option.priceDelta,
                })),
              },
            })),
          },
        },
      });
      await consumeStockForOrder(tx, {
        venueId: input.venueId,
        orderId: created.id,
        items: stockLines,
      });
      return created;
    });

    void pushToVenueRoles(
      input.venueId,
      ["PLATFORM", "OWNER", "ADMIN", "KITCHEN"],
      {
        title: "Yeni sipariş",
        body: `${tableLabel(input.tableNumber)} · ${guest.nickname}`,
        url: "/staff/kitchen",
        tag: `order-${order.id}`,
      },
    );

    return { ok: true, orderId: order.id, status: order.status };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")) {
      return {
        ok: false,
        status: 409,
        error: `${error.message.slice("OUT_OF_STOCK:".length)} için yeterli stok yok`,
      };
    }
    console.error("Personel siparişi yazılamadı", error);
    return { ok: false, status: 500, error: "Sipariş gönderilemedi" };
  }
}
