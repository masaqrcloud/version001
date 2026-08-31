"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";
import { tableLabel } from "@/lib/table-label";
import { orderStatusLabel } from "@/lib/labels";
import type { OrderStatus } from "@prisma/client";

type HistoryResponse = {
  sessions: {
    id: string;
    tableNumber: string;
    openedAt: string;
    closedAt: string | null;
    paid: boolean;
    total: number;
    guests: string[];
    feedback: { rating: number; comment: string | null }[];
    orders: {
      id: string;
      guestName: string;
      createdAt: string;
      status: OrderStatus;
      cancelReason: string | null;
      events: {
        fromStatus: OrderStatus | null;
        toStatus: OrderStatus;
        actorName: string | null;
        reason: string | null;
        createdAt: string;
      }[];
      items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
        note: string | null;
        options: string[];
      }[];
    }[];
  }[];
};

function when(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryList() {
  const { data } = usePoll<HistoryResponse>("/api/staff/history", 20000);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const list = data?.sessions ?? [];
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return list;
    return list.filter((session) => {
      const hay = [
        `masa ${session.tableNumber}`,
        tableLabel(session.tableNumber),
        ...session.guests,
        ...session.orders.flatMap((order) => [
          order.guestName,
          ...order.items.map((item) => item.name),
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("tr");
      return hay.includes(q);
    });
  }, [data, query]);

  if (!data) {
    return <p className="mt-8 text-[var(--muted)]">Yükleniyor…</p>;
  }

  if (data.sessions.length === 0) {
    return (
      <p className="mt-8 text-[var(--muted)]">
        Henüz kapanmış masa yok. Garson hesabı kapatınca burada birikir.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Masa, isim veya ürün ara"
      />
      {sessions.length === 0 ? (
        <p className="text-[var(--muted)]">Eşleşen kayıt yok.</p>
      ) : null}
      {sessions.map((session) => {
        const expanded = openId === session.id;
        return (
          <Card key={session.id} className="p-5">
            <button
              type="button"
              className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
              onClick={() => setOpenId(expanded ? null : session.id)}
            >
              <div>
                <h2 className="text-2xl">{tableLabel(session.tableNumber)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {session.guests.join(" · ") || "İsimsiz"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {when(session.closedAt || session.openedAt)}
                  {session.paid ? " · kasada ödendi" : ""}
                </p>
              </div>
              <p className="font-serif text-2xl">{formatTRY(session.total)}</p>
            </button>
            {expanded ? (
              <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
                {session.orders.map((order) => (
                  <div
                    key={order.id}
                    className={
                      order.status === "CANCELLED" ? "opacity-65" : undefined
                    }
                  >
                    <p className="text-sm font-medium">
                      {order.guestName} · {orderStatusLabel[order.status]}
                    </p>
                    {order.cancelReason ? (
                      <p className="text-xs text-red-700">
                        İptal nedeni: {order.cancelReason}
                      </p>
                    ) : null}
                    <ul className="mt-1 text-sm text-[var(--muted)]">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>
                            {item.quantity}× {item.name}
                            {item.options.length
                              ? ` · ${item.options.join(", ")}`
                              : ""}
                            {item.note ? ` (${item.note})` : ""}
                          </span>
                          <span>{formatTRY(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <details className="mt-2 text-xs text-[var(--muted)]">
                      <summary className="cursor-pointer">İşlem geçmişi</summary>
                      <ul className="mt-1 space-y-1">
                        {order.events.map((event, index) => (
                          <li key={`${event.createdAt}-${index}`}>
                            {when(event.createdAt)} ·{" "}
                            {orderStatusLabel[event.toStatus]}
                            {event.actorName ? ` · ${event.actorName}` : ""}
                            {event.reason ? ` · ${event.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
                {session.feedback.length ? (
                  <div className="rounded-xl bg-black/[0.03] p-3 text-sm">
                    <p className="font-medium">
                      Müşteri puanı:{" "}
                      {(
                        session.feedback.reduce(
                          (sum, item) => sum + item.rating,
                          0,
                        ) / session.feedback.length
                      ).toFixed(1)}
                      /5
                    </p>
                    {session.feedback
                      .filter((item) => item.comment)
                      .map((item, index) => (
                        <p
                          key={`${item.rating}-${index}`}
                          className="mt-1 text-[var(--muted)]"
                        >
                          “{item.comment}”
                        </p>
                      ))}
                  </div>
                ) : null}
                <Link
                  href={`/staff/waiter/${session.id}`}
                  className="inline-block text-sm text-[var(--accent)]"
                >
                  Detayı aç →
                </Link>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
