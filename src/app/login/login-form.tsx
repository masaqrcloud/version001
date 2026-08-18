"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {
    error: undefined as string | undefined,
  });

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="mehmetali@kafe.com"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Şifre</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--accent)]"
          >
            Şifremi unuttum
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Kapı açılıyor…" : "Mekânıma gir"}
      </Button>
    </form>
  );
}
