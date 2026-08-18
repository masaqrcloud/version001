import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStaffUser } from "@/lib/tenant";
import { sendDigitalReceiptMail } from "@/lib/receipt-mail";

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
      guests: true,
      table: { include: { venue: true } },
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
        receiptEmail: null,
      },
    });
  });

  const lines = session.orders
    .filter((order) => order.status !== "CANCELLED")
    .flatMap((order) =>
      order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    );
  const recipients = session.guests.filter(
    (guest) => guest.receiptEmail && !guest.receiptSentAt,
  );
  await Promise.all(
    recipients.map(async (guest) => {
      try {
        const sent = await sendDigitalReceiptMail({
          email: guest.receiptEmail!,
          venueName: session.table.venue.name,
          tableNumber: session.table.number,
          lines,
        });
        if (sent) {
          await prisma.guest.update({
            where: { id: guest.id },
            data: { receiptSentAt: new Date() },
          });
        }
      } catch (mailError) {
        console.error("Dijital adisyon gönderilemedi", mailError);
      }
    }),
  );

  return NextResponse.json({ ok: true, total });
}
