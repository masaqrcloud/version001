"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { tableLabel } from "@/lib/table-label";
import { asCoord, hasCoordinates } from "@/lib/maps";
import { VenueMap } from "@/components/venue-map";

type TableOption = {
  id: string;
  number: string;
  available: boolean;
  occupied?: boolean;
  reserved?: boolean;
  floorX: number | null;
  floorY: number | null;
};

function autoPosition(index: number, total: number) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: Math.round(((column + 0.5) / columns) * 1000),
    y: Math.round(((row + 0.5) / rows) * 1000),
  };
}

function TableGlyph({
  state,
}: {
  state: "available" | "busy" | "selected" | "locked";
}) {
  const surface =
    state === "selected"
      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
      : state === "available"
        ? "border-emerald-300 bg-emerald-100 text-emerald-900"
        : state === "busy"
          ? "border-red-300 bg-red-100 text-red-900"
          : "border-black/15 bg-black/[0.04] text-[var(--muted)]";
  const chair =
    state === "selected"
      ? "bg-[var(--accent)]/50"
      : state === "available"
        ? "bg-emerald-300"
        : state === "busy"
          ? "bg-red-300"
          : "bg-black/15";

  return (
    <div className="relative mx-auto h-16 w-[4.5rem]" aria-hidden="true">
      <span
        className={`absolute left-1/2 top-0 h-2.5 w-7 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute bottom-0 left-1/2 h-2.5 w-7 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute left-0 top-1/2 h-7 w-2.5 -translate-y-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute right-0 top-1/2 h-7 w-2.5 -translate-y-1/2 rounded-md ${chair}`}
      />
      <div
        className={`absolute inset-x-4 inset-y-3 flex items-center justify-center rounded-xl border-2 ${surface}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      </div>
    </div>
  );
}

export function ReservationForm({
  venues,
}: {
  venues: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
}) {
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
        new Date(),
      ),
    [],
  );
  const [form, setForm] = useState({
    venueId: venues[0]?.id ?? "",
    tableId: "",
    fullName: "",
    email: "",
    phone: "",
    guestCount: "2",
    reservationDate: "",
    reservationTime: "",
    note: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [tablesBusy, setTablesBusy] = useState(false);
  const timeReady = Boolean(form.reservationDate && form.reservationTime);
  const selectedTable = tables.find((table) => table.id === form.tableId);
  const selectedVenue = venues.find((venue) => venue.id === form.venueId);
  const venueLat = asCoord(selectedVenue?.latitude);
  const venueLng = asCoord(selectedVenue?.longitude);

  useEffect(() => {
    if (!form.venueId) return;
    let cancelled = false;
    const params = new URLSearchParams({ venueId: form.venueId });
    if (form.reservationDate) params.set("date", form.reservationDate);
    if (form.reservationTime) params.set("time", form.reservationTime);
    setTablesBusy(true);
    void fetch(`/api/reservations?${params}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("tables failed");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setTables(data.tables ?? []);
        setForm((current) => {
          const selected = data.tables?.find(
            (table: { id: string; available: boolean }) =>
              table.id === current.tableId && table.available,
          );
          return selected ? current : { ...current, tableId: "" };
        });
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      })
      .finally(() => {
        if (!cancelled) setTablesBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.venueId, form.reservationDate, form.reservationTime]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.tableId) {
      setError("Lütfen bir masa seç.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        guestCount: Number(form.guestCount),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Rezervasyon gönderilemedi.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <p className="font-serif text-3xl">Talebini aldık.</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Mekân rezervasyonunu değerlendirdiğinde e-posta ile haber vereceğiz.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => {
            setSent(false);
            setForm((current) => ({ ...current, tableId: "" }));
          }}
        >
          Salona dön
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <Label htmlFor="venueId">Mekân</Label>
        <select
          id="venueId"
          required
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
          value={form.venueId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              venueId: event.target.value,
              tableId: "",
            }))
          }
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>
      {selectedVenue &&
      (hasCoordinates(venueLat, venueLng) || selectedVenue.address) ? (
        <VenueMap
          latitude={venueLat}
          longitude={venueLng}
          label={selectedVenue.name}
          address={selectedVenue.address}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Ad soyad</Label>
          <Input
            id="fullName"
            required
            minLength={3}
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="reservationDate">Tarih</Label>
          <Input
            id="reservationDate"
            type="date"
            required
            min={today}
            value={form.reservationDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reservationDate: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="reservationTime">Saat</Label>
          <Input
            id="reservationTime"
            type="time"
            required
            value={form.reservationTime}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reservationTime: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="guestCount">Kişi</Label>
          <Input
            id="guestCount"
            type="number"
            min="1"
            max="30"
            required
            value={form.guestCount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                guestCount: event.target.value,
              }))
            }
          />
        </div>
      </div>
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <Label>Masa seçimi</Label>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tarih ve saati seç, salondan masanı işaretle.
            </p>
          </div>
          {tablesBusy ? (
            <span className="text-xs text-[var(--muted)]">Kontrol ediliyor…</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            Yeşil: uygun
          </span>
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">
            Kırmızı: dolu veya rezerve
          </span>
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--accent)]">
            Turuncu: senin seçimin
          </span>
        </div>
        <div className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(237,226,211,0.75))] p-3 shadow-inner sm:p-5">
          <div className="mb-3 flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2 text-xs text-[var(--muted)]">
            <span>Salon girişi</span>
            <span>
              {selectedTable
                ? `${tableLabel(selectedTable.number)} seçildi`
                : timeReady
                  ? "Bir masa seç"
                  : "Önce tarih ve saat"}
            </span>
          </div>
          {tables.length ? (
            <div className="-mx-1 overflow-x-auto pb-1 touch-pan-x">
              <p className="mb-2 text-center text-[11px] text-[var(--muted)] sm:hidden">
                Krokiyi yana kaydır
              </p>
              <div className="relative h-[340px] w-[640px] sm:h-[420px] sm:w-full">
              {tables.map((table, index) => {
                const selected = form.tableId === table.id;
                const selectable = timeReady && table.available;
                const state = selected
                  ? "selected"
                  : !timeReady
                    ? "locked"
                    : table.available
                      ? "available"
                      : "busy";
                const position =
                  table.floorX !== null && table.floorY !== null
                    ? { x: table.floorX, y: table.floorY }
                    : autoPosition(index, tables.length);
                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={!selectable}
                    className={`absolute w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-1 text-center shadow-sm transition sm:w-[108px] sm:p-1.5 ${
                      selected
                        ? "z-20 border-[var(--accent)] bg-[var(--accent-soft)]"
                        : selectable
                          ? "z-10 border-emerald-200 bg-white/90 hover:scale-105 hover:border-emerald-400"
                          : timeReady
                            ? "z-0 cursor-not-allowed border-red-200 bg-red-50/90"
                            : "z-0 cursor-not-allowed border-black/10 bg-white/70 opacity-60"
                    }`}
                    style={{
                      left: `${position.x / 10}%`,
                      top: `${position.y / 10}%`,
                    }}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        tableId: table.id,
                      }))
                    }
                  >
                    <TableGlyph state={state} />
                    <p className="mt-0.5 truncate font-serif text-[11px] leading-tight sm:text-sm">
                      {tableLabel(table.number)}
                    </p>
                    <p
                      className={`text-[9px] font-medium sm:text-[10px] ${
                        selected
                          ? "text-[var(--accent)]"
                          : selectable
                            ? "text-emerald-700"
                            : timeReady
                              ? "text-red-700"
                              : "text-[var(--muted)]"
                      }`}
                    >
                      {selected
                        ? "Seçildi"
                        : !timeReady
                          ? "Beklemede"
                          : table.occupied
                            ? "Dolu"
                            : table.reserved
                              ? "Rezerve"
                              : table.available
                                ? "Uygun"
                                : "Dolu"}
                    </p>
                  </button>
                );
              })}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-amber-800">
              {tablesBusy
                ? "Salon hazırlanıyor…"
                : "Bu mekânda henüz rezervasyon için masa tanımlanmamış."}
            </p>
          )}
          {!timeReady && tables.length ? (
            <p className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl bg-black/55 px-3 py-2 text-center text-xs text-white sm:text-sm">
              Tarih ve saati seçince uygun masalar yeşile döner.
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <Label htmlFor="note">Not</Label>
        <Textarea
          id="note"
          maxLength={400}
          placeholder="Özel gün, çocuk sandalyesi veya diğer isteklerin…"
          value={form.note}
          onChange={(event) =>
            setForm((current) => ({ ...current, note: event.target.value }))
          }
        />
      </div>
      <input
        className="hidden"
        tabIndex={-1}
        value={form.website}
        onChange={(event) =>
          setForm((current) => ({ ...current, website: event.target.value }))
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Rezervasyon talebi gönder"}
      </Button>
    </form>
  );
}
