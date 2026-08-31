"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { pingPhone } from "@/lib/phone-alert";
import { usePoll } from "@/lib/poll";
import { tableLabel } from "@/lib/table-label";
import { formatTRY } from "@/lib/utils";

type SessionsResponse = {
  sessions: {
    id: string;
    tableNumber: string;
    openedAt: string;
    waiterCalledAt: string | null;
    billRequestedAt: string | null;
    guestCount: number;
    orderCount: number;
    pendingCount: number;
    total: number;
  }[];
};

export function WaiterBoard() {
  const { data } = usePoll<SessionsResponse>("/api/staff/sessions", 5000);
  const seenCalls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    for (const session of data.sessions) {
      if (session.billRequestedAt) {
        const key = `bill:${session.id}:${session.billRequestedAt}`;
        if (!seenCalls.current.has(key)) {
          seenCalls.current.add(key);
          pingPhone(
            "Hesap isteniyor",
            `${tableLabel(session.tableNumber)} hesabı istiyor`,
          );
        }
      }
      if (!session.waiterCalledAt) continue;
      const key = `${session.id}:${session.waiterCalledAt}`;
      if (seenCalls.current.has(key)) continue;
      seenCalls.current.add(key);
      pingPhone("Garson çağrısı", `${tableLabel(session.tableNumber)} çağırıyor`);
    }
  }, [data]);

  if (!data) {
    return <p className="mt-8 text-[var(--muted)]">Yükleniyor…</p>;
  }

  if (data.sessions.length === 0) {
    return (
      <p className="mt-8 text-[var(--muted)]">
        Açık masa yok. Krokide boş masaya basıp QR’siz sipariş yazabilirsin.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.sessions.map((session) => (
        <Link key={session.id} href={`/staff/waiter/${session.id}`}>
          <Card
            className={`p-5 transition hover:-translate-y-0.5 ${
              session.billRequestedAt || session.waiterCalledAt
                ? "border-[var(--accent)]"
                : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl">{tableLabel(session.tableNumber)}</h2>
              {session.billRequestedAt ? (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                  Hesap
                </span>
              ) : session.waiterCalledAt ? (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                  Çağrı
                </span>
              ) : session.pendingCount > 0 ? (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                  {session.pendingCount} aktif
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {session.guestCount} misafir · {session.orderCount} sipariş
            </p>
            <p className="mt-4 text-lg">{formatTRY(session.total)}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
