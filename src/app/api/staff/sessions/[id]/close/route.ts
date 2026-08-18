import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { user, error } = await getStaffUser(["PLATFORM", "OWNER", "ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await context.params;
  const session = await prisma.tableSession.findFirst({
    where: { id, table: { venueId: user.venueId } },
    include: {
      orders: { include: { items: true } },
      bill: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Oturum yok" }, { status: 404 });
  }
  if (session.status === "CLOSED") {
    return NextResponse.json({ error: "Masa zaten kapalı" }, { status: 400 });
  }

  const total = session.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce(
      (sum, order) =>
        sum +
        order.items.reduce((s, item) => s + Number(item.price) * item.quantity, 0),
      0,
    );

  await prisma.$transaction(async (tx) => {
    await tx.tableSession.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    if (session.bill) {
      await tx.bill.update({
        where: { id: session.bill.id },
        data: { status: "PAID", total, paidAt: new Date() },
      });
    } else {
      await tx.bill.create({
        data: {
          tableSessionId: id,
          status: "PAID",
          total,
          paidAt: new Date(),
        },
      });
    }

    await tx.cartItem.deleteMany({
      where: { guest: { tableSessionId: id } },
    });
    await tx.guestNotification.deleteMany({
      where: { guest: { tableSessionId: id } },
    });
    await tx.guest.deleteMany({
      where: {
        tableSessionId: id,
        orders: { none: {} },
      },
    });
  });

  return NextResponse.json({ ok: true, total });
}
