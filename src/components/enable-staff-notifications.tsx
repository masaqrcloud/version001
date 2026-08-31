"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { askAlertPermission, pingPhone } from "@/lib/phone-alert";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function EnableStaffNotifications() {
  const [state, setState] = useState<
    "idle" | "busy" | "enabled" | "unsupported" | "error"
  >("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    void navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (existing) setState("enabled");
    });
  }, []);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState("error");
      return;
    }
    setState("busy");
    try {
      await askAlertPermission();
      const registration = await navigator.serviceWorker.register("/sw.js");
      const current = await registration.pushManager.getSubscription();
      const subscription =
        current ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      const response = await fetch("/api/staff/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("subscription failed");
      setState("enabled");
      pingPhone("Bildirimler açık", "MasaQR personel bildirimleri etkinleştirildi.");
    } catch {
      setState("error");
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-[var(--muted)]">
        Bu tarayıcı arka plan bildirimini desteklemiyor.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={state === "enabled" ? "secondary" : "outline"}
        disabled={state === "busy" || state === "enabled"}
        onClick={() => void enable()}
      >
        {state === "enabled"
          ? "Bildirimler açık"
          : state === "busy"
            ? "Açılıyor…"
            : "Bildirimleri aç"}
      </Button>
      {state === "error" ? (
        <span className="text-xs text-red-700">
          Bildirim açılamadı; izin ve PWA ayarlarını kontrol edin.
        </span>
      ) : null}
    </div>
  );
}
