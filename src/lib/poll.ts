"use client";

import { useEffect, useState } from "react";

export function usePoll<T>(
  url: string | null,
  interval = 5000,
  guestToken?: string | null,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          headers: guestToken ? { "x-guest-token": guestToken } : undefined,
        });
        if (!res.ok) {
          throw new Error("Yüklenemedi");
        }
        const json = (await res.json()) as T;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Hata");
        }
      }
    };

    void load();
    const id = setInterval(() => void load(), interval);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, interval, guestToken]);

  return { data, error, setData };
}
