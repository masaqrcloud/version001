"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";

type Summary = {
  day: string;
  days: number;
  paidTotal: number;
  openTotal: number;
  closedCount: number;
  openCount: number;
  orderCount: number;
  itemCount: number;
  topItems: { name: string; quantity: number; total: number }[];
  cancellationCount: number;
  cancellationRate: number;
  cancellationReasons: { reason: string; count: number }[];
  averagePreparationMinutes: number | null;
  averageTableMinutes: number | null;
  averageRating: number | null;
  feedbackCount: number;
  openTables: { id: string; tableNumber: string; guests: number }[];
  closedTables: {
    id: string;
    tableNumber: string;
    total: number;
    closedAt: string | null;
  }[];
};

export function SummaryView() {
  const [days, setDays] = useState(1);
  const { data } = usePoll<Summary>(
    `/api/staff/summary?days=${days}`,
    20000,
  );

  if (!data) {
    return <p className="mt-8 text-[var(--muted)]">Yükleniyor…</p>;
  }

  const cards = [
    { label: "Kasada ciro", value: formatTRY(data.paidTotal) },
    { label: "Açık hesap", value: formatTRY(data.openTotal) },
    { label: "Kapanan masa", value: String(data.closedCount) },
    { label: "Sipariş", value: `${data.orderCount} · ${data.itemCount} ürün` },
  ];

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap gap-2">
        {[
          [1, "Bugün"],
          [7, "7 gün"],
          [30, "30 gün"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`rounded-full px-4 py-2 text-sm ${
              days === value
                ? "bg-[var(--ink)] text-[var(--bg)]"
                : "bg-black/5"
            }`}
            onClick={() => setDays(Number(value))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 font-serif text-3xl">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">İptal oranı</p>
          <p className="mt-2 font-serif text-3xl">
            %{(data.cancellationRate * 100).toFixed(1)}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {data.cancellationCount} sipariş
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Hazırlama süresi</p>
          <p className="mt-2 font-serif text-3xl">
            {data.averagePreparationMinutes === null
              ? "—"
              : `${data.averagePreparationMinutes.toFixed(0)} dk`}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Masa kullanım süresi</p>
          <p className="mt-2 font-serif text-3xl">
            {data.averageTableMinutes === null
              ? "—"
              : `${data.averageTableMinutes.toFixed(0)} dk`}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">Müşteri puanı</p>
          <p className="mt-2 font-serif text-3xl">
            {data.averageRating === null
              ? "—"
              : `${data.averageRating.toFixed(1)}/5`}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {data.feedbackCount} değerlendirme
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">En çok satanlar</h2>
          <div className="mt-3 space-y-2">
            {data.topItems.length === 0 ? (
              <p className="text-[var(--muted)]">Bugün henüz satış yok.</p>
            ) : (
              data.topItems.map((item) => (
                <Card key={item.name} className="flex justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {item.quantity} adet
                    </p>
                  </div>
                  <p>{formatTRY(item.total)}</p>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl">Açık masalar</h2>
          <div className="mt-3 space-y-2">
            {data.openTables.length === 0 ? (
              <p className="text-[var(--muted)]">Açık masa yok.</p>
            ) : (
              data.openTables.map((table) => (
                <Link key={table.id} href={`/staff/waiter/${table.id}`}>
                  <Card className="flex justify-between p-4">
                    <p>Masa {table.tableNumber}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {table.guests} kişi
                    </p>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      {data.cancellationReasons.length ? (
        <div>
          <h2 className="text-2xl">İptal nedenleri</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.cancellationReasons.map((item) => (
              <Card
                key={item.reason}
                className="flex items-center justify-between gap-3 p-4"
              >
                <p>{item.reason}</p>
                <span className="text-sm text-[var(--muted)]">
                  {item.count}
                </span>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
