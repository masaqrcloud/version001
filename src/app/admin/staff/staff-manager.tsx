"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@prisma/client";

type Staff = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type VenueRole = "OWNER" | "ADMIN" | "WAITER" | "KITCHEN";

export function StaffManager({
  venueName,
  canCreateOwner,
}: {
  venueName: string;
  canCreateOwner: boolean;
}) {
  const roles: VenueRole[] = canCreateOwner
    ? ["OWNER", "ADMIN", "WAITER", "KITCHEN"]
    : ["ADMIN", "WAITER", "KITCHEN"];
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "WAITER" as VenueRole,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/staff", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const json = await res.json();
      setStaff(json.staff ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setError("Ad en az 2 karakter olmalı");
      return;
    }
    if (form.password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Eklenemedi");
        return;
      }
      setForm({ name: "", email: "", password: "", role: "WAITER" });
      setPopup(`${data.name} eklendi · ${data.email}`);
      await load();
    } catch {
      setError("Eklenemedi, tekrar dene");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Silinemedi");
      return;
    }
    setPopup("Hesap silindi.");
    await load();
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Popup
        title="Personel"
        message={popup}
        onClose={() => setPopup(null)}
      />

      <Card className="divide-y divide-[var(--line)]">
        {staff.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">
            {venueName} için henüz hesap yok. Sağdan ekle.
          </p>
        ) : (
          staff.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {person.email} · {roleLabel[person.role]}
                </p>
              </div>
              {person.role === "OWNER" && !canCreateOwner ? null : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void remove(person.id)}
                >
                  Sil
                </Button>
              )}
            </div>
          ))
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-xl">{venueName} hesabı</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bu kişi sadece bu mekana giriş yapar.
        </p>
        <form className="mt-3 space-y-3" onSubmit={create}>
          <div>
            <Label>Ad</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn. Mehmet"
            />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="mehmet@kafe.com"
            />
          </div>
          <div>
            <Label>Şifre</Label>
            <Input
              type="password"
              required
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="En az 6 karakter"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <select
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as VenueRole,
                }))
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role]}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Ekleniyor…" : "Hesap oluştur"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
