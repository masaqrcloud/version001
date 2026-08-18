"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ApplicationRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  venueName: string;
  city: string | null;
  venueType: string | null;
  message: string | null;
  status: "NEW" | "REVIEWED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

const statusLabel = {
  NEW: "Yeni",
  REVIEWED: "İncelendi",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

export function ApplicationsManager({
  applications,
}: {
  applications: ApplicationRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    const confirmed = window.confirm(
      action === "approve"
        ? "Başvuru onaylansın, mekân ve işletme sahibi hesabı oluşturulsun mu?"
        : "Başvuru reddedilsin ve başvuru sahibine e-posta gönderilsin mi?",
    );
    if (!confirmed) return;
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setMessage(data.error ?? "İşlem tamamlanamadı.");
      return;
    }
    setMessage(
      data.emailSent === false
        ? "Durum kaydedildi fakat e-posta gönderilemedi."
        : action === "approve"
          ? "Başvuru onaylandı; hesap kurulum e-postası gönderildi."
          : "Başvuru reddedildi; bilgilendirme e-postası gönderildi.",
    );
    router.refresh();
  }

  if (applications.length === 0) {
    return (
      <Card className="p-6 text-sm text-[var(--muted)]">
        Henüz başvuru yok.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {applications.map((application) => (
        <Card key={application.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-serif text-2xl">{application.venueName}</p>
              <p className="mt-1 font-medium">{application.fullName}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a
                  href={`mailto:${application.email}`}
                  className="text-[var(--accent)]"
                >
                  {application.email}
                </a>
                {application.phone ? (
                  <a href={`tel:${application.phone}`}>{application.phone}</a>
                ) : null}
              </div>
            </div>
            <div className="text-sm text-[var(--muted)] sm:text-right">
              <p className="font-medium text-[var(--ink)]">
                {statusLabel[application.status]}
              </p>
              <time dateTime={application.createdAt}>
                {new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(application.createdAt))}
              </time>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-[var(--muted)]">Şehir:</span>{" "}
              {application.city ?? "-"}
            </p>
            <p>
              <span className="text-[var(--muted)]">Mekân türü:</span>{" "}
              {application.venueType ?? "-"}
            </p>
          </div>
          {application.message ? (
            <p className="mt-3 rounded-xl bg-black/[0.03] p-3 text-sm leading-relaxed">
              {application.message}
            </p>
          ) : null}

          {application.status === "NEW" ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busyId === application.id}
                onClick={() => void decide(application.id, "approve")}
              >
                Onayla ve hesap aç
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === application.id}
                onClick={() => void decide(application.id, "reject")}
              >
                Reddet
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
