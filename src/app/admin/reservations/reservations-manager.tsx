"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tableLabel } from "@/lib/table-label";

type Row = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  guestCount: number;
  reservationDate: string;
  reservationTime: string;
  note: string | null;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  tableId: string | null;
};

const labels = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
};

function ReservationRow({
  reservation,
  tables,
  selectedTable,
  busy,
  onSelectTable,
  onDecide,
}: {
  reservation: Row;
  tables: { id: string; number: string }[];
  selectedTable: string;
  busy: boolean;
  onSelectTable: (tableId: string) => void;
  onDecide: (action: "confirm" | "reject") => void;
}) {
  const chosen = tables.find((table) => table.id === reservation.tableId)?.number;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-xl leading-snug">{reservation.fullName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {reservation.reservationDate} · {reservation.reservationTime} ·{" "}
            {reservation.guestCount} kişi
          </p>
          <p className="mt-2 text-sm">
            <a
              className="text-[var(--accent)]"
              href={`mailto:${reservation.email}`}
            >
              {reservation.email}
            </a>{" "}
            · <a href={`tel:${reservation.phone}`}>{reservation.phone}</a>
          </p>
        </div>
        <p className="text-sm font-medium">{labels[reservation.status]}</p>
      </div>
      {reservation.note ? (
        <p className="mt-3 rounded-lg bg-soft p-2.5 text-sm">{reservation.note}</p>
      ) : null}
      {reservation.tableId ? (
        <p className="mt-3 text-sm font-medium text-ok">
          Misafirin seçtiği masa: {chosen ? tableLabel(chosen) : "—"}
        </p>
      ) : null}
      {reservation.status === "PENDING" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-xl border border-[var(--line)] bg-surface px-3 text-sm"
            value={selectedTable}
            onChange={(event) => onSelectTable(event.target.value)}
          >
            <option value="">Masa sonra belirlenecek</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {tableLabel(table.number)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onDecide("confirm")}
          >
            Onayla
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onDecide("reject")}
          >
            Reddet
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReservationPanel({
  title,
  description,
  count,
  emptyText,
  rows,
  tables,
  selectedTables,
  busyId,
  onSelectTable,
  onDecide,
}: {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  rows: Row[];
  tables: { id: string; number: string }[];
  selectedTables: Record<string, string>;
  busyId: string | null;
  onSelectTable: (id: string, tableId: string) => void;
  onDecide: (id: string, action: "confirm" | "reject") => void;
}) {
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <h2 className="font-serif text-2xl text-[var(--ink)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </div>
        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-soft px-2.5 py-1 text-sm font-semibold text-[var(--ink)]">
          {count}
        </span>
      </div>
      <div className="mt-4 flex-1 space-y-3">
        {rows.length ? (
          rows.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              tables={tables}
              selectedTable={selectedTables[reservation.id] ?? ""}
              busy={busyId === reservation.id}
              onSelectTable={(tableId) => onSelectTable(reservation.id, tableId)}
              onDecide={(action) => onDecide(reservation.id, action)}
            />
          ))
        ) : (
          <p className="py-6 text-sm text-[var(--muted)]">{emptyText}</p>
        )}
      </div>
    </Card>
  );
}

export function ReservationsManager({
  reservations,
  tables,
  today,
}: {
  reservations: Row[];
  tables: { id: string; number: string }[];
  today: string;
}) {
  const router = useRouter();
  const [selectedTables, setSelectedTables] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        reservations
          .filter((reservation) => reservation.tableId)
          .map((reservation) => [
            reservation.id,
            reservation.tableId as string,
          ]),
      ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const upcomingRows: Row[] = [];
    const pastRows: Row[] = [];
    for (const reservation of reservations) {
      if (reservation.reservationDate < today) pastRows.push(reservation);
      else upcomingRows.push(reservation);
    }
    upcomingRows.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      const byDate = a.reservationDate.localeCompare(b.reservationDate);
      if (byDate !== 0) return byDate;
      return a.reservationTime.localeCompare(b.reservationTime);
    });
    pastRows.sort((a, b) => {
      const byDate = b.reservationDate.localeCompare(a.reservationDate);
      if (byDate !== 0) return byDate;
      return b.reservationTime.localeCompare(a.reservationTime);
    });
    return { upcoming: upcomingRows, past: pastRows };
  }, [reservations, today]);

  async function decide(id: string, action: "confirm" | "reject") {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        tableId: selectedTables[id] || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error ?? "İşlem tamamlanamadı.");
      return;
    }
    setMessage(
      data.emailSent === false
        ? "Durum kaydedildi fakat e-posta gönderilemedi."
        : "Rezervasyon güncellendi ve misafire e-posta gönderildi.",
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <ReservationPanel
          title="Bekleyen rezervasyonlar"
          description="Bugün ve sonraki tarihler"
          count={upcoming.length}
          emptyText="Bekleyen rezervasyon yok."
          rows={upcoming}
          tables={tables}
          selectedTables={selectedTables}
          busyId={busyId}
          onSelectTable={(id, tableId) =>
            setSelectedTables((current) => ({ ...current, [id]: tableId }))
          }
          onDecide={(id, action) => void decide(id, action)}
        />
        <ReservationPanel
          title="Geçmiş rezervasyonlar"
          description="Tarihi bir gün geçmiş kayıtlar"
          count={past.length}
          emptyText="Geçmiş rezervasyon yok."
          rows={past}
          tables={tables}
          selectedTables={selectedTables}
          busyId={busyId}
          onSelectTable={(id, tableId) =>
            setSelectedTables((current) => ({ ...current, [id]: tableId }))
          }
          onDecide={(id, action) => void decide(id, action)}
        />
      </div>
    </div>
  );
}
