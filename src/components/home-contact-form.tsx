"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function HomeContactForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    venueName: "",
    city: "",
    venueType: "Kafe",
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Mesaj gönderilemedi.");
        return;
      }

      setSent(true);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyiniz.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="py-8 text-center">
        <p className="font-serif text-3xl">Mesajınız alındı.</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          MasaQR ekibi, en kısa sürede kayıtlı e-posta adresiniz üzerinden
          sizinle iletişime geçecektir.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="home-fullName">Ad soyad</Label>
          <Input
            id="home-fullName"
            required
            minLength={3}
            maxLength={80}
            autoComplete="name"
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({ ...current, fullName: event.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="home-email">E-posta</Label>
          <Input
            id="home-email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="home-phone">Telefon</Label>
          <Input
            id="home-phone"
            type="tel"
            required
            maxLength={24}
            autoComplete="tel"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="home-city">Şehir</Label>
          <Input
            id="home-city"
            required
            minLength={2}
            maxLength={60}
            autoComplete="address-level1"
            value={form.city}
            onChange={(event) =>
              setForm((current) => ({ ...current, city: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="home-venueName">Mekân adı</Label>
          <Input
            id="home-venueName"
            required
            minLength={2}
            maxLength={100}
            value={form.venueName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                venueName: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="home-venueType">Mekân türü</Label>
          <select
            id="home-venueType"
            className="h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            value={form.venueType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                venueType: event.target.value,
              }))
            }
          >
            <option>Kafe</option>
            <option>Restoran</option>
            <option>Bar</option>
            <option>Pastane</option>
            <option>Otel</option>
            <option>Diğer</option>
          </select>
        </div>
      </div>
      <div>
          <Label htmlFor="home-message">Mesajınız</Label>
        <Textarea
          id="home-message"
          maxLength={600}
          placeholder="Masa sayısı, paket tercihi veya iletmek istediğiniz not…"
          value={form.message}
          onChange={(event) =>
            setForm((current) => ({ ...current, message: event.target.value }))
          }
        />
      </div>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={form.website}
        onChange={(event) =>
          setForm((current) => ({ ...current, website: event.target.value }))
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Gönder"}
      </Button>
    </form>
  );
}
