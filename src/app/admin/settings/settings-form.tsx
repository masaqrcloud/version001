"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { slugify } from "@/lib/slug";
import { parseOpeningHours } from "@/lib/opening-hours";
import { VenueMap } from "@/components/venue-map";

const dayNames = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

export function SettingsForm({
  name,
  slug,
  tagline,
  logoUrl,
  coverUrl,
  openingHours,
  wifiName,
  wifiPassword,
  address,
  latitude,
  longitude,
}: {
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  openingHours: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name,
    slug,
    tagline: tagline ?? "",
    logoUrl: logoUrl ?? "",
    coverUrl: coverUrl ?? "",
    openingHours: parseOpeningHours(openingHours),
    wifiName: wifiName ?? "",
    wifiPassword: wifiPassword ?? "",
    address: address ?? "",
    latitude,
    longitude,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [finding, setFinding] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { latitude: number; longitude: number; address: string }[]
  >([]);
  const suggestTimer = useRef<number | null>(null);
  const skipSuggest = useRef(false);

  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false;
      return;
    }
    const query = form.address.trim();
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = window.setTimeout(() => {
      void (async () => {
        setFinding(true);
        const response = await fetch(
          `/api/admin/geocode?q=${encodeURIComponent(query)}`,
        );
        const json = await response.json().catch(() => ({}));
        setFinding(false);
        setSuggestions(json.suggestions ?? []);
      })();
    }, 350);
    return () => {
      if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    };
  }, [form.address]);

  async function findOnMap() {
    const query = form.address.trim() || form.name.trim();
    if (query.length < 3) {
      setError("Konum için adres yaz");
      return;
    }
    setFinding(true);
    setError(null);
    const response = await fetch(
      `/api/admin/geocode?q=${encodeURIComponent(query)}`,
    );
    const json = await response.json().catch(() => ({}));
    setFinding(false);
    const hits = json.suggestions as
      | { latitude: number; longitude: number; address: string }[]
      | undefined;
    if (!hits?.length) {
      setSuggestions([]);
      setError("Öneri çıkmadı. Haritadan pini elle koyabilirsin.");
      return;
    }
    setSuggestions(hits);
    applyLocation(hits[0]);
  }

  function applyLocation(next: {
    latitude: number;
    longitude: number;
    address?: string;
  }) {
    const latitude = Number(next.latitude.toFixed(6));
    const longitude = Number(next.longitude.toFixed(6));
    skipSuggest.current = true;
    setForm((current) => ({
      ...current,
      latitude,
      longitude,
      address: next.address?.trim() || current.address,
    }));
    setSuggestions([]);
    setError(null);
    void persistLocation({
      latitude,
      longitude,
      address: next.address,
    });
  }

  async function persistLocation(next: {
    latitude: number;
    longitude: number;
    address?: string;
  }) {
    const address = (next.address ?? form.address).trim() || null;
    await fetch("/api/admin/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        latitude: next.latitude,
        longitude: next.longitude,
      }),
    });
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);

    const nextSlug = slugify(form.slug || form.name);
    const res = await fetch("/api/admin/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        slug: nextSlug,
        tagline: form.tagline.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        coverUrl: form.coverUrl.trim() || null,
        openingHours: form.openingHours,
        wifiName: form.wifiName.trim() || null,
        wifiPassword: form.wifiPassword || null,
        address: form.address.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Kaydedilemedi");
      return;
    }

    setForm((f) => ({ ...f, slug: json.slug ?? nextSlug }));
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Kimlik
          </p>
          <h2 className="mt-1 font-serif text-2xl">Mekan bilgileri</h2>
        </div>
        <div>
          <Label>Mekan adı</Label>
          <Input
            value={form.name}
            onChange={(e) => {
              const next = e.target.value;
              setForm((f) => ({
                ...f,
                name: next,
                slug: f.slug === slugify(f.name) || !f.slug ? slugify(next) : f.slug,
              }));
            }}
          />
        </div>
        <div>
          <Label>Kısa cümle</Label>
          <Input
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            placeholder="Sabah kahvesi, akşam sohbeti"
            maxLength={120}
          />
        </div>
        <div>
          <Label>Kısa ad (slug)</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Sadece küçük harf ve tire. Türkçe karakterler otomatik çevrilir.
          </p>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-800">Kaydedildi.</p> : null}
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Misafir Wi‑Fi
          </p>
          <h2 className="mt-1 font-serif text-2xl">İnternet bilgileri</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Bu bilgiler yalnızca masadaki müşteri ekranında gösterilir.
          </p>
        </div>
        <div>
          <Label htmlFor="wifi-name">Wi‑Fi adı</Label>
          <Input
            id="wifi-name"
            value={form.wifiName}
            maxLength={80}
            placeholder="Örn. Mekan Misafir"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                wifiName: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="wifi-password">Wi‑Fi şifresi</Label>
          <div className="flex gap-2">
            <Input
              id="wifi-password"
              type={showWifiPassword ? "text" : "password"}
              value={form.wifiPassword}
              maxLength={120}
              autoComplete="new-password"
              placeholder="Misafir ağının şifresi"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  wifiPassword: event.target.value,
                }))
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWifiPassword((current) => !current)}
            >
              {showWifiPassword ? "Gizle" : "Göster"}
            </Button>
          </div>
        </div>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Wi‑Fi bilgisini kaydet"}
        </Button>
      </Card>

      <Card className="space-y-4 p-5 lg:col-span-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Konum
          </p>
          <h2 className="mt-1 font-serif text-2xl">Haritada görün</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Rezervasyon ekranında müşteri bu konumu görür, yakınlaştırır ve
            dokununca harita uygulamasına gider.
          </p>
        </div>
        <div className="relative">
          <Label htmlFor="venue-address">Adres</Label>
          <Input
            id="venue-address"
            value={form.address}
            maxLength={240}
            placeholder="Mahalle, cadde, ilçe / il"
            autoComplete="off"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
          />
          {suggestions.length ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--line)] bg-white py-1 shadow-lg">
              {suggestions.map((item) => (
                <li key={`${item.latitude}-${item.longitude}-${item.address}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--accent-soft)]"
                    onClick={() => applyLocation(item)}
                  >
                    {item.address}
                  </button>
                </li>
              ))}
            </ul>
          ) : finding ? (
            <p className="mt-1 text-xs text-[var(--muted)]">Öneriler aranıyor…</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={finding}
            onClick={() => void findOnMap()}
          >
            {finding ? "Aranıyor…" : "Adresten konumu bul"}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Konumu kaydet"}
          </Button>
        </div>
        <VenueMap
          latitude={form.latitude}
          longitude={form.longitude}
          label={form.name}
          address={form.address}
          editable
          onMove={(nextLat, nextLng) =>
            applyLocation({ latitude: nextLat, longitude: nextLng })
          }
        />
      </Card>

      <Card className="space-y-6 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Görünüm
          </p>
          <h2 className="mt-1 font-serif text-2xl">Logo ve kapak</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Müşteri QR okutunca bunları görür.
          </p>
        </div>
        <ImageUpload
          label="Logo"
          kind="logo"
          value={form.logoUrl || null}
          onChange={(url) => setForm((f) => ({ ...f, logoUrl: url ?? "" }))}
          hint="Kare veya yuvarlak durur. En fazla 2.5 MB."
        />
        <ImageUpload
          label="Kapak fotoğrafı"
          kind="cover"
          wide
          value={form.coverUrl || null}
          onChange={(url) => setForm((f) => ({ ...f, coverUrl: url ?? "" }))}
          hint="Masadaki karşılama ekranının üstünde görünür."
        />
        <Button onClick={() => void save()} disabled={busy} variant="secondary">
          {busy ? "Kaydediliyor…" : "Görünümü kaydet"}
        </Button>
      </Card>

      <Card className="space-y-5 p-5 lg:col-span-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
            Çalışma saatleri
          </p>
          <h2 className="mt-1 font-serif text-2xl">Ne zaman açıksınız?</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Misafir açık/kapalı durumunu görür; kapalıyken sipariş veremez.
          </p>
        </div>
        <div className="space-y-3">
          {form.openingHours.map((hours, index) => (
            <div
              key={hours.day}
              className="grid items-center gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-[8rem_1fr_1fr_auto]"
            >
              <p className="font-medium">{dayNames[hours.day]}</p>
              <Input
                type="time"
                value={hours.open}
                disabled={hours.closed}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    openingHours: current.openingHours.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, open: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <Input
                type="time"
                value={hours.close}
                disabled={hours.closed}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    openingHours: current.openingHours.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, close: event.target.value }
                        : item,
                    ),
                  }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hours.closed}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      openingHours: current.openingHours.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, closed: event.target.checked }
                          : item,
                      ),
                    }))
                  }
                />
                Kapalı
              </label>
            </div>
          ))}
        </div>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Çalışma saatlerini kaydet"}
        </Button>
      </Card>
    </div>
  );
}
