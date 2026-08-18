"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ApplicationForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    venueName: "",
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
        setError(data.error ?? "Başvuru gönderilemedi.");
        return;
      }

      setSent(true);
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <p className="font-serif text-3xl">Başvurunu aldık.</p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          MasaQR ekibi kısa süre içinde e-posta adresinden sana ulaşacak.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Ad soyad</Label>
        <Input
          id="fullName"
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
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
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
      <div>
        <Label htmlFor="venueName">Mekân adı</Label>
        <Input
          id="venueName"
          required
          minLength={2}
          maxLength={100}
          value={form.venueName}
          onChange={(event) =>
            setForm((current) => ({ ...current, venueName: event.target.value }))
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
        {busy ? "Gönderiliyor…" : "Başvuruyu gönder"}
      </Button>
    </form>
  );
}
