"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function ReportSettings({
  reportEmail,
  reportMail,
  fallbackEmails,
}: {
  reportEmail: string | null;
  reportMail: boolean;
  fallbackEmails: string[];
}) {
  const [email, setEmail] = useState(reportEmail ?? "");
  const [enabled, setEnabled] = useState(reportMail);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testNote, setTestNote] = useState<string | null>(null);

  async function sendTest() {
    setTesting(true);
    setTestNote(null);
    setError(null);
    const res = await fetch("/api/admin/report-preview", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setTesting(false);
    if (!res.ok) {
      setError(json.error ?? "Test maili gönderilemedi");
      return;
    }
    const delivered = Array.isArray(json.to) ? json.to : [json.to];
    const failed = Array.isArray(json.failed) ? json.failed : [];
    setTestNote(
      [
        `Test raporu gönderildi: ${delivered.filter(Boolean).join(", ")}`,
        failed.length ? `Gidemedi: ${failed.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/admin/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportEmail: email.trim() || null,
        reportMail: enabled,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Kaydedilemedi");
      return;
    }
    setSaved(true);
  }

  return (
    <Card className="mt-6 space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
          Raporlar
        </p>
        <h2 className="mt-1 font-serif text-2xl">Otomatik e-posta raporları</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Her akşam 23:50’de gün sonu özeti, her pazartesi 09:00’da haftalık
          rapor gönderilir. Ciro, en çok satanlar, hazırlama süresi, misafir
          puanı ve stoğu azalan ürünler grafiklerle gelir.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-soft p-3">
        <input
          type="checkbox"
          checked={enabled}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
          onChange={(event) => {
            setEnabled(event.target.checked);
            setSaved(false);
          }}
        />
        <span className="text-sm">
          Raporları gönder
          <span className="block text-xs text-[var(--muted)]">
            Kapatırsan hiçbir rapor maili gitmez.
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="report-email">Ek rapor adresi (isteğe bağlı)</Label>
        <Input
          id="report-email"
          type="email"
          value={email}
          placeholder="muhasebe@mekanim.com"
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
          }}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          {fallbackEmails.length ? (
            <>
              Boş bırakırsan raporlar giriş yaptığın adrese gider:{" "}
              <span className="font-medium">{fallbackEmails.join(", ")}</span>.
              Buraya bir adres yazarsan rapor oraya da gönderilir.
            </>
          ) : (
            "Boş bırakırsan raporlar mekân sahibi ve yöneticilerin giriş adresine gider."
          )}
        </p>
      </div>

      {error ? <p className="text-sm text-bad">{error}</p> : null}
      {saved ? <p className="text-sm text-ok">Rapor ayarı kaydedildi.</p> : null}
      {testNote ? <p className="text-sm text-ok">{testNote}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Kaydediliyor…" : "Rapor ayarını kaydet"}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            window.open("/api/admin/report-preview?type=gun", "_blank")
          }
        >
          Gün sonunu önizle
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            window.open("/api/admin/report-preview?type=hafta", "_blank")
          }
        >
          Haftalığı önizle
        </Button>
        <Button
          variant="outline"
          onClick={() => void sendTest()}
          disabled={testing}
        >
          {testing ? "Gönderiliyor…" : "Bana test gönder"}
        </Button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Test, giriş hesabına ve kaydettiğin ek rapor adresine gider. Önce
        “Rapor ayarını kaydet”e basmayı unutma.
      </p>
      <p className="text-xs text-[var(--muted)]">
        Müşteriye giden şablonlar:{" "}
        <a
          className="underline"
          href="/api/admin/report-preview?type=hosgeldin"
          target="_blank"
          rel="noreferrer"
        >
          hoş geldin
        </a>
        {" · "}
        <a
          className="underline"
          href="/api/admin/report-preview?type=ikram"
          target="_blank"
          rel="noreferrer"
        >
          müdavim ikramı
        </a>
      </p>
    </Card>
  );
}
