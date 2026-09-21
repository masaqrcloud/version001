"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CustomerSignOutButton({
  label = "Çıkış yap",
  className,
  variant = "outline",
  size = "sm",
}: {
  label?: string;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/guest/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={() => void logout()}
    >
      {busy ? "Çıkılıyor…" : label}
    </Button>
  );
}
