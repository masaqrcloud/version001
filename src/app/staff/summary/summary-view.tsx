"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";

type Summary = {
  day: string;
  paidTotal: number;
  openTotal: number;
  closedCount: number;
  openCount: number;
  orderCount: number;
  itemCount: number;
  topItems: { name: string; quantity: number; total: number }[];
  openTables: { id: string; tableNumber: string; guests: number }[];
  closedTables: {
    id: string;
    tableNumber: string;
    total: number;
    closedAt: string | null;
  }[];
};

export function SummaryView() {
  const { data } = usePoll<Summary>("/api/staff/summary", 20000);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 font-serif text-3xl">{card.value}</p>
          </Card>
        ))}
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
    </div>
  );
}
