"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

export function ReservationsManager({
  reservations,
  tables,
}: {
  reservations: Row[];
  tables: { id: string; number: string }[];
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
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {reservations.map((reservation) => (
        <Card key={reservation.id} className="p-5">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="font-serif text-2xl">{reservation.fullName}</p>
              <p className="text-sm text-[var(--muted)]">
                {reservation.reservationDate} · {reservation.reservationTime} ·{" "}
                {reservation.guestCount} kişi
              </p>
              <p className="mt-2 text-sm">
                <a className="text-[var(--accent)]" href={`mailto:${reservation.email}`}>
                  {reservation.email}
                </a>{" "}
                · <a href={`tel:${reservation.phone}`}>{reservation.phone}</a>
              </p>
            </div>
            <p className="text-sm font-medium">{labels[reservation.status]}</p>
          </div>
          {reservation.note ? (
            <p className="mt-3 rounded-xl bg-black/[0.03] p-3 text-sm">
              {reservation.note}
            </p>
          ) : null}
          {reservation.tableId ? (
            <p className="mt-3 text-sm font-medium text-emerald-800">
              Misafirin seçtiği masa:{" "}
              {tables.find((table) => table.id === reservation.tableId)
                ?.number ?? "—"}
            </p>
          ) : null}
          {reservation.status === "PENDING" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
                value={selectedTables[reservation.id] ?? ""}
                onChange={(event) =>
                  setSelectedTables((current) => ({
                    ...current,
                    [reservation.id]: event.target.value,
                  }))
                }
              >
                <option value="">Masa sonra belirlenecek</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Masa {table.number}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={busyId === reservation.id}
                onClick={() => void decide(reservation.id, "confirm")}
              >
                Onayla
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === reservation.id}
                onClick={() => void decide(reservation.id, "reject")}
              >
                Reddet
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
      {!reservations.length ? (
        <Card className="p-6 text-sm text-[var(--muted)]">
          Henüz rezervasyon talebi yok.
        </Card>
      ) : null}
    </div>
  );
}
