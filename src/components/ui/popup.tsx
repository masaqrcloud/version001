"use client";

import { Button } from "@/components/ui/button";

export function Popup({
  title = "Tamam",
  message,
  onClose,
}: {
  title?: string;
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-serif text-2xl">{title}</p>
        <p className="mt-2 text-[var(--muted)]">{message}</p>
        <Button className="mt-5 w-full" onClick={onClose}>
          Tamam
        </Button>
      </div>
    </div>
  );
}
