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

function ReservationCard({
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
  return (
    <Card className="p-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="font-serif text-2xl">{reservation.fullName}</p>
          <p className="text-sm text-[var(--muted)]">
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
        <p className="mt-3 rounded-xl bg-soft p-3 text-sm">{reservation.note}</p>
      ) : null}
      {reservation.tableId ? (
        <p className="mt-3 text-sm font-medium text-ok">
          Misafirin seçtiği masa:{" "}
          {(() => {
            const chosen = tables.find(
              (table) => table.id === reservation.tableId,
            )?.number;
            return chosen ? tableLabel(chosen) : "—";
          })()}
        </p>
      ) : null}
      {reservation.status === "PENDING" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
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

  function renderList(rows: Row[], emptyText: string) {
    if (!rows.length) {
      return (
        <Card className="p-6 text-sm text-[var(--muted)]">{emptyText}</Card>
      );
    }
    return (
      <div className="space-y-4">
        {rows.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            tables={tables}
            selectedTable={selectedTables[reservation.id] ?? ""}
            busy={busyId === reservation.id}
            onSelectTable={(tableId) =>
              setSelectedTables((current) => ({
                ...current,
                [reservation.id]: tableId,
              }))
            }
            onDecide={(action) => void decide(reservation.id, action)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
          {message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="page-kicker">Aktif</p>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">
            Bekleyen rezervasyonlar
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bugün ve sonraki tarihlerdeki talepler.
          </p>
        </div>
        {renderList(upcoming, "Bekleyen rezervasyon yok.")}
      </section>

      <section className="space-y-4">
        <div>
          <p className="page-kicker">Arşiv</p>
          <h2 className="mt-1 font-serif text-2xl text-[var(--ink)]">
            Geçmiş rezervasyonlar
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Rezervasyon tarihi bir gün geçmiş kayıtlar.
          </p>
        </div>
        {renderList(past, "Geçmiş rezervasyon yok.")}
      </section>
    </div>
  );
}
