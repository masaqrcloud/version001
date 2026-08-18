"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { slugify } from "@/lib/slug";

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    venueName: "",
    ownerName: "",
    email: "",
    password: "",
  });

  const slug = slugify(form.venueName);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const created = await fetch("/api/venues/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueName: form.venueName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        slug,
      }),
    });

    if (!created.ok) {
      const json = await created.json().catch(() => ({}));
      setBusy(false);
      setError(json.error ?? "Mekan oluşturulamadı");
      return;
    }

    const csrf = await fetch("/api/auth/csrf").then((res) => res.json());
    const login = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: form.email,
        password: form.password,
        redirect: "false",
      }),
    });

    setBusy(false);
    if (!login.ok && login.status >= 400) {
      router.push("/login");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="venueName">Mekan adı</Label>
        <Input
          id="venueName"
          required
          minLength={2}
          value={form.venueName}
          onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))}
          placeholder="Örn. Sahil Kahve"
        />
        {slug ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Kısa ad: {slug}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="ownerName">Senin adın</Label>
        <Input
          id="ownerName"
          required
          minLength={2}
          value={form.ownerName}
          onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Oluşturuluyor…" : "Mekanı oluştur"}
      </Button>
    </form>
  );
}
