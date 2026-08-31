"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderBadge } from "@/components/ui/badge";
import { usePoll } from "@/lib/poll";
import type { OrderStatus } from "@prisma/client";
import { pingPhone } from "@/lib/phone-alert";

type OrdersResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    tableNumber: string;
    guestName: string;
    items: { id: string; name: string; quantity: number; note: string | null; options: string[] }[];
  }[];
};

const actionLabel: Partial<Record<OrderStatus, string>> = {
  PENDING: "Hazırlamaya başla",
  PREPARING: "Hazır",
  READY: "Servis bekliyor",
};

export function KitchenBoard() {
  const { data, setData } = usePoll<OrdersResponse>("/api/staff/orders", 5000);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const seenOrders = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    if (!seenOrders.current) {
      seenOrders.current = new Set(data.orders.map((order) => order.id));
      return;
    }
    for (const order of data.orders) {
      if (seenOrders.current.has(order.id)) continue;
      seenOrders.current.add(order.id);
      pingPhone(
        "Yeni sipariş",
        `Masa ${order.tableNumber} · ${order.guestName}`,
      );
    }
  }, [data]);

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

  async function cancel() {
    if (!cancelId || cancelReason.trim().length < 3) return;
    const response = await fetch(`/api/staff/orders/${cancelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CANCELLED",
        reason: cancelReason.trim(),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.alert(result.error ?? "Sipariş iptal edilemedi.");
      return;
    }
    setCancelId(null);
    setCancelReason("");
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
    <>
      {cancelId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md p-5">
            <h2 className="font-serif text-2xl">Siparişi iptal et</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Stok otomatik iade edilir ve işlem geçmişe kaydedilir.
            </p>
            <Input
              className="mt-4"
              autoFocus
              maxLength={200}
              value={cancelReason}
              placeholder="İptal nedeni"
              onChange={(event) => setCancelReason(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCancelId(null);
                  setCancelReason("");
                }}
              >
                Vazgeç
              </Button>
              <Button
                disabled={cancelReason.trim().length < 3}
                onClick={() => void cancel()}
              >
                İptal et
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
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
                {item.options.length ? (
                  <span className="block text-xs text-[var(--muted)]">
                    {item.options.join(" · ")}
                  </span>
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
            <Button variant="ghost" onClick={() => setCancelId(order.id)}>
              İptal
            </Button>
          </div>
        </Card>
      ))}
      </div>
    </>
  );
}
