"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function VenueSwitchButton({
  venueId,
  venueName,
  isActive,
}: {
  venueId: string;
  venueName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (isActive) {
    return (
      <Button size="sm" onClick={() => router.push("/admin/staff")}>
        Personel ekle
      </Button>
    );
  }

  async function switchVenue() {
    setBusy(true);
    const res = await fetch("/api/admin/venues/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ venueId }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/admin/staff");
      router.refresh();
    }
  }

  return (
    <Button size="sm" disabled={busy} onClick={() => void switchVenue()}>
      {busy ? "Giriliyor…" : "Mekana gir"}
    </Button>
  );
}
