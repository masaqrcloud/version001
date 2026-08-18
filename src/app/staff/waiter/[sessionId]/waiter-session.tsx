"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderBadge } from "@/components/ui/badge";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";

type Detail = {
  id: string;
  status: "OPEN" | "CLOSED";
  tableNumber: string;
  waiterCalledAt: string | null;
  otherTables: { id: string; tableNumber: string }[];
  total: number;
  guests: { id: string; nickname: string }[];
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    guestName: string;
    items: { id: string; name: string; price: number; quantity: number; note: string | null }[];
  }[];
};

export function WaiterSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { data } = usePoll<Detail>(`/api/staff/sessions/${sessionId}`, 5000);
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  async function closeTable() {
    const ok = window.confirm("Masa kapatılsın ve hesap ödendi işaretlensin mi?");
    if (!ok) return;
    const res = await fetch(`/api/staff/sessions/${sessionId}/close`, {
      method: "POST",
    });
    if (res.ok) {
      router.push("/staff/waiter");
    }
  }

  async function markServed(id: string) {
    await fetch(`/api/staff/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SERVED" }),
    });
  }

  async function ackCall() {
    await fetch(`/api/staff/sessions/${sessionId}/call`, { method: "POST" });
  }

  async function mergeTable() {
    if (!targetId) return;
    const ok = window.confirm(
      "Bu masanın misafirleri ve hesabı seçilen masaya geçer. Devam?",
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/staff/sessions/${sessionId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetSessionId: targetId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Birleştirilemedi");
      return;
    }
    router.push(`/staff/waiter/${json.targetSessionId}`);
  }

  if (!data) {
    return <p className="text-[var(--muted)]">Yükleniyor…</p>;
  }

  return (
    <div>
      <Link href="/staff/waiter" className="text-sm text-[var(--accent)]">
        ← Masalar
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Masa {data.tableNumber}</h1>
          <p className="mt-1 text-[var(--muted)]">
            {data.guests.map((g) => g.nickname).join(", ") || "Misafir yok"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--muted)]">Toplam</p>
          <p className="font-serif text-3xl">{formatTRY(data.total)}</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {data.orders.length === 0 ? (
          <p className="text-[var(--muted)]">Henüz sipariş yok.</p>
        ) : (
          data.orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <OrderBadge status={order.status} />
                  <span className="text-sm">{order.guestName}</span>
                </div>
                {order.status === "READY" ? (
                  <Button size="sm" onClick={() => void markServed(order.id)}>
                    Servis edildi
                  </Button>
                ) : null}
              </div>
              <ul className="mt-3 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.quantity}× {item.name}
                      {item.note ? ` (${item.note})` : ""}
                    </span>
                    <span>{formatTRY(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </div>

      {data.status === "OPEN" && data.waiterCalledAt ? (
        <Card className="mt-8 border-[var(--accent)] p-4">
          <p className="font-medium">Masa garson çağırdı</p>
          <Button className="mt-3" onClick={() => void ackCall()}>
            Gidiyorum
          </Button>
        </Card>
      ) : null}

      {data.status === "OPEN" && data.otherTables.length > 0 ? (
        <Card className="mt-6 space-y-3 p-4">
          <p className="font-medium">Masa birleştir</p>
          <p className="text-sm text-[var(--muted)]">
            Bu masanın kişileri ve siparişleri seçtiğin masaya geçer.
          </p>
          <select
            className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Hedef masa seç</option>
            {data.otherTables.map((table) => (
              <option key={table.id} value={table.id}>
                Masa {table.tableNumber}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!targetId || busy}
            onClick={() => void mergeTable()}
          >
            {busy ? "Birleştiriliyor…" : "Birleştir"}
          </Button>
        </Card>
      ) : null}

      {data.status === "OPEN" ? (
        <Button className="mt-8" onClick={() => void closeTable()}>
          Hesabı kapat · kasada ödendi
        </Button>
      ) : (
        <p className="mt-8 text-sm text-[var(--muted)]">Bu masa kapatıldı.</p>
      )}
    </div>
  );
}
