"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

export function ImageUpload({
  label,
  value,
  onChange,
  kind,
  hint,
  wide,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  kind: "logo" | "cover" | "menu";
  hint?: string;
  wide?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Yüklenemedi");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Yüklenemedi, tekrar dene");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        <div
          className={
            wide
              ? "photo-box mb-3 h-28 w-full rounded-2xl"
              : "photo-box mb-3 h-24 w-24 rounded-2xl"
          }
        >
          <img src={value} alt="" />
        </div>
      ) : (
        <div
          className={
            wide
              ? "mb-3 flex h-28 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm text-[var(--muted)]"
              : "mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-xs text-[var(--muted)]"
          }
        >
          Foto yok
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center rounded-full bg-[var(--ink)] px-4 text-sm font-medium text-[var(--bg)]">
          {busy ? "Yükleniyor…" : value ? "Değiştir" : "Fotoğraf yükle"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {value ? (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Kaldır
          </Button>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
