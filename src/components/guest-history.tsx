"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { GoogleJoinButton } from "@/components/google-join-button";
import { Popup } from "@/components/ui/popup";
import { useLocale } from "@/components/locale-provider";
import { formatTRY } from "@/lib/utils";
import { tableLabel } from "@/lib/table-label";

type HistoryResponse = {
  linked: boolean;
  googleAuth: boolean;
  customer?: { name: string | null; email: string };
  venues?: {
    venueId: string;
    venueName: string;
    logoUrl: string | null;
    visits: {
      sessionId: string;
      tableNumber: string;
      openedAt: string;
      closedAt: string | null;
      orders: {
        id: string;
        createdAt: string;
        items: { name: string; quantity: number; price: number }[];
      }[];
    }[];
  }[];
};

export function GuestHistory({
  qrToken,
  onDeleted,
}: {
  qrToken: string;
  onDeleted?: () => void;
}) {
  const { t, dateLocale } = useLocale();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/guest/history", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function removeAccount() {
    setBusy(true);
    const res = await fetch("/api/guest/account", {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    setConfirmDelete(false);
    if (!res.ok) return;
    setMessage(t("historyDeleted"));
    setData({ linked: false, googleAuth: data?.googleAuth ?? false });
    onDeleted?.();
  }

  const venues = data?.venues ?? [];

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">{t("historyKicker")}</p>
        <h2 className="mt-1 font-serif text-3xl">{t("historyTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("historyIntro")}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{t("historyLoyaltySoon")}</p>
      </div>

      {!data ? (
        <p className="text-sm text-[var(--muted)]">{t("connecting")}</p>
      ) : !data.linked ? (
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">{t("historyNeedGoogle")}</p>
          {data.googleAuth ? (
            <GoogleJoinButton
              className="mt-4"
              href={`/api/guest/auth/google?qr=${encodeURIComponent(qrToken)}`}
              label={t("joinGoogle")}
            />
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("googleUnavailable")}
            </p>
          )}
        </Card>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            {data.customer?.name || data.customer?.email}
          </p>
          {!venues.length ? (
            <p className="text-sm text-[var(--muted)]">{t("historyEmpty")}</p>
          ) : (
            venues.map((venue) => (
              <section key={venue.venueId} className="space-y-3">
                <div className="flex items-center gap-2">
                  {venue.logoUrl ? (
                    <div className="photo-box h-8 w-8 rounded-full border border-[var(--line)] bg-white">
                      <img src={venue.logoUrl} alt="" />
                    </div>
                  ) : null}
                  <h3 className="font-serif text-2xl">{venue.venueName}</h3>
                </div>
                {venue.visits.map((visit) => (
                  <Card key={visit.sessionId} className="p-4">
                    <p className="text-xs text-[var(--muted)]">
                      {t("historyVisit", {
                        table: tableLabel(visit.tableNumber, t("tableWord")),
                        date: new Date(visit.openedAt).toLocaleDateString(
                          dateLocale,
                          { day: "numeric", month: "short", year: "numeric" },
                        ),
                      })}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {visit.orders.flatMap((order) =>
                        order.items.map((item, index) => (
                          <li
                            key={`${order.id}-${index}`}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {item.quantity}× {item.name}
                            </span>
                            <span>{formatTRY(item.price * item.quantity)}</span>
                          </li>
                        )),
                      )}
                    </ul>
                  </Card>
                ))}
              </section>
            ))
          )}
          <button
            type="button"
            className="min-h-11 text-sm text-[var(--muted)] underline-offset-4 hover:underline"
            onClick={() => setConfirmDelete(true)}
          >
            {t("historyDelete")}
          </button>
        </>
      )}
      {message ? (
        <p className="text-sm text-[var(--accent)]">{message}</p>
      ) : null}
      <Popup
        title={t("historyDelete")}
        message={confirmDelete ? t("historyDeleteBody") : null}
        confirmLabel={t("historyDelete")}
        cancelLabel={t("dismiss")}
        busy={busy}
        onConfirm={() => void removeAccount()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
