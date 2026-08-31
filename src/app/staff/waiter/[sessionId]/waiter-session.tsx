"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderBadge } from "@/components/ui/badge";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";
import { tableLabel } from "@/lib/table-label";
import type { OrderStatus } from "@prisma/client";

type Detail = {
  id: string;
  status: "OPEN" | "CLOSED";
  tableNumber: string;
  waiterCalledAt: string | null;
  billRequestedAt: string | null;
  mergedTables: { id: string; number: string }[];
  otherTables: { id: string; tableNumber: string }[];
  mergeTargets: { id: string; number: string; occupied: boolean }[];
  transferTargets: { id: string; number: string }[];
  total: number;
  guests: { id: string; nickname: string }[];
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    guestName: string;
    items: { id: string; name: string; price: number; quantity: number; note: string | null; options: string[] }[];
  }[];
};

export function WaiterSession({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { data, setData } = usePoll<Detail>(`/api/staff/sessions/${sessionId}`, 5000);
  const [mergeId, setMergeId] = useState("");
  const [transferId, setTransferId] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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

  async function cancelOrder() {
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
      window.alert(result.error ?? "Sipariş iptal edilemedi");
      return;
    }
    setCancelId(null);
    setCancelReason("");
  }

  async function ackCall(kind: "waiter" | "bill") {
    await fetch(`/api/staff/sessions/${sessionId}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const refreshed = await fetch(`/api/staff/sessions/${sessionId}`, {
      cache: "no-store",
    });
    if (refreshed.ok) setData(await refreshed.json());
  }

  async function mergeTable() {
    if (!mergeId) return;
    const ok = window.confirm(
      "Seçilen masa bu hesapla birleşir. İki masa da dolu/kırmızı kalır, aynı misafirler görünür.",
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/staff/sessions/${sessionId}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTableId: mergeId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Birleştirilemedi");
      return;
    }
    setMergeId("");
    const refreshed = await fetch(`/api/staff/sessions/${sessionId}`, {
      cache: "no-store",
    });
    if (refreshed.ok) setData(await refreshed.json());
  }

  async function transferTable() {
    if (!transferId) return;
    const ok = window.confirm(
      "Kişiler ve hesap boş masaya geçer. Bu masa boşalır.",
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/staff/sessions/${sessionId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTableId: transferId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Aktarılamadı");
      return;
    }
    router.push(`/staff/waiter/${json.sessionId ?? sessionId}`);
  }

  async function unmergeTable(tableId: string) {
    setBusy(true);
    const res = await fetch(`/api/staff/sessions/${sessionId}/unmerge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Ayırılamadı");
      return;
    }
    const refreshed = await fetch(`/api/staff/sessions/${sessionId}`, {
      cache: "no-store",
    });
    if (refreshed.ok) setData(await refreshed.json());
  }

  if (!data) {
    return <p className="text-[var(--muted)]">Yükleniyor…</p>;
  }

  return (
    <div>
      {cancelId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md p-5">
            <h2 className="font-serif text-2xl">Siparişi iptal et</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Nedeni işlem geçmişinde görünecek, stok otomatik iade edilecek.
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
                onClick={() => void cancelOrder()}
              >
                İptal et
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      <Link href="/staff/waiter" className="text-sm text-[var(--accent)]">
        ← Masalar
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{tableLabel(data.tableNumber)}</h1>
          <p className="mt-1 text-[var(--muted)]">
            {data.guests.map((g) => g.nickname).join(", ") || "Misafir yok"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[var(--muted)]">Toplam</p>
          <p className="font-serif text-3xl">{formatTRY(data.total)}</p>
          {data.status === "OPEN" ? (
            <Link
              href={`/staff/waiter/${sessionId}/order`}
              className="mt-3 inline-flex h-10 items-center rounded-xl bg-[var(--ink)] px-4 text-sm text-[var(--bg)]"
            >
              Sipariş yaz
            </Link>
          ) : null}
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
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void markServed(order.id)}>
                      Servis edildi
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelId(order.id)}
                    >
                      İptal
                    </Button>
                  </div>
                ) : order.status === "PENDING" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCancelId(order.id)}
                  >
                    İptal
                  </Button>
                ) : null}
              </div>
              <ul className="mt-3 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.quantity}× {item.name}
                      {item.options.length ? ` · ${item.options.join(", ")}` : ""}
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

      {data.status === "OPEN" && data.billRequestedAt ? (
        <Card className="mt-8 border-[var(--accent)] p-4">
          <p className="font-medium">Masa hesabı istiyor</p>
          <Button className="mt-3" onClick={() => void ackCall("bill")}>
            Hesabı alıyorum
          </Button>
        </Card>
      ) : null}

      {data.status === "OPEN" && data.waiterCalledAt ? (
        <Card className="mt-8 border-[var(--accent)] p-4">
          <p className="font-medium">Masa garson çağırdı</p>
          <Button className="mt-3" onClick={() => void ackCall("waiter")}>
            Gidiyorum
          </Button>
        </Card>
      ) : null}

      {data.status === "OPEN" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-4">
            <p className="font-medium">Masa birleştir</p>
            <p className="text-sm text-[var(--muted)]">
              {tableLabel(data.tableNumber)} ile seçtiğin masa yan yana durur, ikisi
              de kırmızı kalır, aynı kişiler görünür.
            </p>
            {data.mergedTables?.length ? (
              <ul className="space-y-2 text-sm">
                {data.mergedTables.map((table) => (
                  <li
                    key={table.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-red-900"
                  >
                    <span>{tableLabel(table.number)} birleşik</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void unmergeTable(table.id)}
                    >
                      Ayır
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <select
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
              value={mergeId}
              onChange={(e) => setMergeId(e.target.value)}
            >
              <option value="">Birleştirilecek masa</option>
              {data.mergeTargets?.map((table) => (
                <option key={table.id} value={table.id}>
                  {tableLabel(table.number)}
                  {table.occupied ? " · dolu" : " · boş"}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!mergeId || busy}
              onClick={() => void mergeTable()}
            >
              {busy ? "Birleştiriliyor…" : "Birleştir"}
            </Button>
          </Card>

          <Card className="space-y-3 p-4">
            <p className="font-medium">Masa aktar</p>
            <p className="text-sm text-[var(--muted)]">
              Kişiler ve hesap boş masaya geçer. Bu masa yeşile döner.
            </p>
            <select
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
            >
              <option value="">Boş masa seç</option>
              {data.transferTargets?.map((table) => (
                <option key={table.id} value={table.id}>
                  {tableLabel(table.number)}
                </option>
              ))}
            </select>
            <Button
              disabled={!transferId || busy}
              onClick={() => void transferTable()}
            >
              {busy ? "Aktarılıyor…" : "Aktar"}
            </Button>
            {!data.transferTargets?.length ? (
              <p className="text-xs text-[var(--muted)]">
                Aktarılacak boş masa yok.
              </p>
            ) : null}
          </Card>
        </div>
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
