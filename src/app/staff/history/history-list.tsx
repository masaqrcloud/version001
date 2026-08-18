"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";

type HistoryResponse = {
  sessions: {
    id: string;
    tableNumber: string;
    openedAt: string;
    closedAt: string | null;
    paid: boolean;
    total: number;
    guests: string[];
    orders: {
      id: string;
      guestName: string;
      createdAt: string;
      items: {
        id: string;
        name: string;
        quantity: number;
        price: number;
        note: string | null;
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
                <h2 className="text-2xl">Masa {session.tableNumber}</h2>
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
                  <div key={order.id}>
                    <p className="text-sm font-medium">{order.guestName}</p>
                    <ul className="mt-1 text-sm text-[var(--muted)]">
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
                  </div>
                ))}
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
