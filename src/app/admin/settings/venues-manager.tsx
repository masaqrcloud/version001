"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { slugify } from "@/lib/slug";

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  tagline: string | null;
  tableCount: number;
  staffCount: number;
  categoryCount: number;
  isActive: boolean;
};

export function VenuesManager({ canCreate = false }: { canCreate?: boolean }) {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/venues", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return;
    const json = await res.json();
    setVenues(json.venues ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addVenue(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2) {
      setError("Mekan adı en az 2 karakter olmalı");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: value, slug: slugify(value) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Mekan eklenemedi");
        return;
      }
      const created: VenueRow = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl ?? null,
        coverUrl: data.coverUrl ?? null,
        tagline: data.tagline ?? null,
        tableCount: 0,
        staffCount: 0,
        categoryCount: 0,
        isActive: false,
      };
      setVenues((current) =>
        current.some((item) => item.id === created.id)
          ? current
          : [...current, created],
      );
      setName("");
      await fetch("/api/admin/venues/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ venueId: data.id }),
      });
      setPopup(`${data.name} eklendi. Şimdi personel ekle.`);
      router.push("/admin/staff");
      router.refresh();
    } catch {
      setError("Mekan eklenemedi, tekrar dene");
    } finally {
      setBusy(false);
    }
  }

  async function switchVenue(venue: VenueRow) {
    const res = await fetch("/api/admin/venues/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ venueId: venue.id }),
    });
    if (!res.ok) {
      setError("Mekan değiştirilemedi");
      return;
    }
    await load();
    setPopup(`${venue.name} açıldı. Personel ekleyebilirsin.`);
    setSuccess(`${venue.name} artık aktif mekan.`);
    router.push("/admin/staff");
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Popup
        title="Mekan eklendi"
        message={popup}
        onClose={() => setPopup(null)}
      />

      <div className="space-y-3">
        {venues.map((venue) => (
          <Card key={venue.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex min-w-0 items-center gap-3">
              {venue.logoUrl ? (
                <div className="photo-box h-12 w-12 rounded-xl border border-[var(--line)] bg-white">
                  <img src={venue.logoUrl} alt="" />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-serif text-lg text-[var(--accent)]">
                  {venue.name.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="font-serif text-2xl">{venue.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {venue.slug} · {venue.tableCount} masa · {venue.categoryCount} kategori ·{" "}
                  {venue.staffCount} personel
                  {venue.isActive ? " · şu an bu mekan" : ""}
                </p>
              </div>
            </div>
            {canCreate ? (
              venue.isActive ? (
                <Button size="sm" onClick={() => router.push("/admin/staff")}>
                  Personel ekle
                </Button>
              ) : (
                <Button size="sm" onClick={() => void switchVenue(venue)}>
                  Mekana gir
                </Button>
              )
            ) : null}
          </Card>
        ))}
        {venues.length === 0 ? (
          <p className="text-[var(--muted)]">Henüz mekan yok.</p>
        ) : null}
      </div>

      {canCreate ? (
      <Card className="h-fit space-y-3 p-5">
        <h2 className="font-serif text-xl">Mekan ekle</h2>
        <form className="space-y-3" onSubmit={addVenue}>
          <div>
            <Label htmlFor="venue-name">Mekan adı</Label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Sahil Kahve"
            />
            {name.trim() ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Kısa ad: {slugify(name)}
              </p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {success ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Ekleniyor…" : "Mekan ekle"}
          </Button>
        </form>
      </Card>
      ) : null}
    </div>
  );
}
