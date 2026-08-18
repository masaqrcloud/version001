"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderBadge } from "@/components/ui/badge";
import { usePoll } from "@/lib/poll";
import type { OrderStatus } from "@prisma/client";

type OrdersResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    tableNumber: string;
    guestName: string;
    items: { id: string; name: string; quantity: number; note: string | null }[];
  }[];
};

const actionLabel: Partial<Record<OrderStatus, string>> = {
  PENDING: "Hazırlamaya başla",
  PREPARING: "Hazır",
  READY: "Servis bekliyor",
};

export function KitchenBoard() {
  const { data, setData } = usePoll<OrdersResponse>("/api/staff/orders", 5000);

  async function advance(id: string) {
    const patched = await fetch(`/api/staff/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advance: true }),
    });
    if (!patched.ok) {
      window.alert("Durum güncellenemedi, tekrar dene.");
      return;
    }
    const res = await fetch("/api/staff/orders", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  async function cancel(id: string) {
    await fetch(`/api/staff/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const res = await fetch("/api/staff/orders", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  if (!data) {
    return <p className="mt-8 text-[var(--muted)]">Yükleniyor…</p>;
  }

  if (data.orders.length === 0) {
    return (
      <p className="mt-8 text-[var(--muted)]">Bekleyen sipariş yok.</p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.orders.map((order) => (
        <Card key={order.id} className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-2xl">Masa {order.tableNumber}</h2>
            <OrderBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {order.guestName} ·{" "}
            {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <ul className="mt-4 flex-1 space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                <span className="font-medium">
                  {item.quantity}× {item.name}
                </span>
                {item.note ? (
                  <span className="text-[var(--muted)]"> — {item.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            {order.status !== "READY" ? (
              <Button className="flex-1" onClick={() => void advance(order.id)}>
                {actionLabel[order.status]}
              </Button>
            ) : (
              <p className="flex-1 self-center text-sm text-emerald-800">
                Garson alsın
              </p>
            )}
            <Button variant="ghost" onClick={() => void cancel(order.id)}>
              İptal
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
