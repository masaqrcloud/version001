"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocaleOptional } from "@/components/locale-provider";

export function SessionFeedbackForm({
  token,
  onSubmitted,
}: {
  token?: string;
  onSubmitted?: () => void;
}) {
  const loc = useLocaleOptional();
  const t = loc?.t;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (!rating) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/guest/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        rating,
        comment: comment.trim() || undefined,
        token,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? (t ? t("feedbackFail") : "Değerlendirme gönderilemedi"));
      return;
    }
    setMessage(t ? t("feedbackOk") : "Teşekkürler, değerlendirmen kaydedildi.");
    onSubmitted?.();
  }

  return (
    <div>
      <p className="font-medium">{t ? t("feedbackAsk") : "Deneyimin nasıldı?"}</p>
      <div className="mt-3 flex gap-2" aria-label={t ? t("feedbackAria") : "1 ile 5 arası puan"}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={t ? t("starAria", { n: value }) : `${value} puan`}
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg ${
              rating >= value
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
            onClick={() => setRating(value)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 min-h-24 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
        maxLength={500}
        value={comment}
        placeholder={t ? t("commentPh") : "İstersen kısa bir yorum bırak"}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button
        className="mt-3"
        disabled={!rating || busy}
        onClick={() => void submit()}
      >
        {busy ? (t ? t("sending") : "Gönderiliyor…") : t ? t("sendFeedback") : "Değerlendirmeyi gönder"}
      </Button>
      {message ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
