"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import { slugify } from "@/lib/slug";

export function SettingsForm({
  name,
  slug,
  tagline,
  logoUrl,
  coverUrl,
}: {
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name,
    slug,
    tagline: tagline ?? "",
    logoUrl: logoUrl ?? "",
    coverUrl: coverUrl ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    </div>
  );
}
