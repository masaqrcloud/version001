"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function ReservationForm({
  venues,
}: {
  venues: { id: string; name: string }[];
}) {
  const [form, setForm] = useState({
    venueId: venues[0]?.id ?? "",
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

  async function submit(event: FormEvent) {
    event.preventDefault();
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
            setForm((current) => ({ ...current, venueId: event.target.value }))
          }
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>
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
