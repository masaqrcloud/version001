"use client";

import { Button } from "@/components/ui/button";

export function Popup({
  title = "Tamam",
  message,
  onClose,
  onConfirm,
  confirmLabel = "Evet",
  cancelLabel = "Vazgeç",
  busy = false,
}: {
  title?: string;
  message: string | null;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
}) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-serif text-2xl">{title}</p>
        <p className="mt-2 text-[var(--muted)]">{message}</p>
        {onConfirm ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button disabled={busy} onClick={onConfirm}>
              {busy ? "Bekle…" : confirmLabel}
            </Button>
          </div>
        ) : (
          <Button className="mt-5 w-full" onClick={onClose}>
            Tamam
          </Button>
        )}
      </div>
    </div>
  );
}
