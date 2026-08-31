"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";

type FloorResponse = {
  tables: {
    id: string;
    number: string;
    occupied: boolean;
    sessionId: string | null;
    guestCount: number;
    orderCount: number;
    pendingCount: number;
    waiterCalledAt: string | null;
    total: number;
  }[];
  summary: {
    total: number;
    occupied: number;
    available: number;
    guests: number;
  };
};

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19.2C2 15.8 5.1 13 9 13s7 2.8 7 6.2c0 1-.8 1.8-1.8 1.8H3.8c-1 0-1.8-.8-1.8-1.8Zm14.2-6.1c3.3.3 5.8 2.6 5.8 5.4 0 .8-.7 1.5-1.5 1.5h-2.6c.1-.3.1-.5.1-.8 0-2.4-1.2-4.5-3.1-5.9.4-.1.8-.2 1.3-.2Z"
      />
    </svg>
  );
}

function TableShape({ occupied }: { occupied: boolean }) {
  const surface = occupied
    ? "border-red-300 bg-red-100 text-red-900 shadow-red-200/70"
    : "border-emerald-300 bg-emerald-100 text-emerald-900 shadow-emerald-200/70";
  const chair = occupied ? "bg-red-300" : "bg-emerald-300";

  return (
    <div className="relative mx-auto h-28 w-32" aria-hidden="true">
      <span
        className={`absolute left-1/2 top-0 h-4 w-10 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute left-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute right-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-md ${chair}`}
      />
      <div
        className={`absolute inset-x-6 inset-y-5 flex items-center justify-center rounded-[1.4rem] border-2 shadow-lg ${surface}`}
      >
        <span className="h-3 w-3 rounded-full bg-current opacity-70" />
      </div>
    </div>
  );
}

export function VenueFloorPlan({
  emptyHref,
}: {
  emptyHref?: string;
}) {
  const { data, error } = usePoll<FloorResponse>("/api/staff/floor", 3000);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Canlı salon</p>
          <h2 className="font-serif text-3xl">Masa krokisi</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            QR okutulan masalar en geç 3 saniye içinde dolu görünür.
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
              {data.summary.available} boş
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">
              {data.summary.occupied} dolu
            </span>
            <span className="rounded-full bg-black/5 px-3 py-1.5">
              {data.summary.guests} misafir
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-[2rem] border border-[var(--line)] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(237,226,211,0.75))] p-4 shadow-inner sm:p-7">
        <div className="mb-5 flex items-center justify-between border-b border-dashed border-[var(--line)] pb-3 text-xs text-[var(--muted)]">
          <span>Salon girişi</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Canlı
          </span>
        </div>

        {!data && !error ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Salon hazırlanıyor…
          </p>
        ) : null}
        {error ? (
          <p className="py-12 text-center text-sm text-red-700">
            Masa bilgileri alınamadı.
          </p>
        ) : null}
        {data?.tables.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Henüz masa eklenmemiş.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.tables.map((table) => {
            const content = (
              <Card
                className={`relative overflow-hidden p-4 transition hover:-translate-y-0.5 ${
                  table.occupied
                    ? "border-red-200 bg-red-50/80"
                    : "border-emerald-200 bg-emerald-50/80"
                }`}
              >
                {table.waiterCalledAt ? (
                  <span className="absolute right-3 top-3 animate-pulse rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white">
                    Garson çağrısı
                  </span>
                ) : null}
                <TableShape occupied={table.occupied} />
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-serif text-2xl">Masa {table.number}</p>
                    <p
                      className={`text-sm font-medium ${
                        table.occupied
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {table.occupied ? "Dolu" : "Boş"}
                    </p>
                  </div>
                  {table.occupied ? (
                    <div className="text-right text-xs text-[var(--muted)]">
                      <p className="flex items-center justify-end gap-1">
                        <PeopleIcon />
                        {table.guestCount} kişi
                      </p>
                      <p className="mt-1">
                        {table.orderCount} sipariş
                        {table.pendingCount
                          ? ` · ${table.pendingCount} aktif`
                          : ""}
                      </p>
                      <p className="mt-1 font-medium text-[var(--ink)]">
                        {formatTRY(table.total)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            );

            if (table.sessionId) {
              return (
                <Link
                  key={table.id}
                  href={`/staff/waiter/${table.sessionId}`}
                >
                  {content}
                </Link>
              );
            }
            if (emptyHref) {
              return (
                <Link key={table.id} href={emptyHref}>
                  {content}
                </Link>
              );
            }
            return <div key={table.id}>{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
