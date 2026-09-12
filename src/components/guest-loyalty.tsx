"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { GoogleJoinButton } from "@/components/google-join-button";
import { useLocale } from "@/components/locale-provider";

type LoyaltyVenue = {
  venueId: string;
  venueName: string;
  logoUrl: string | null;
  enabled: boolean;
  item: { id: string; name: string; imageUrl: string | null } | null;
  count: number;
  filled: number;
  rewards: number;
  complete: boolean;
  threshold: number;
};

type LoyaltyResponse = {
  linked: boolean;
  googleAuth: boolean;
  venues?: LoyaltyVenue[];
};

function PunchRing({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  return (
    <div className="loyalty-ring" aria-hidden>
      {Array.from({ length: total }, (_, index) => {
        const angle = (index / total) * 360 - 90;
        const on = index < filled;
        return (
          <span
            key={index}
            className={`loyalty-dot${on ? " loyalty-dot-on" : ""}`}
            style={{
              transform: `rotate(${angle}deg) translate(5.4rem) rotate(${-angle}deg)`,
            }}
          >
            {index + 1}
          </span>
        );
      })}
      <div className="loyalty-ring-center">
        <p className="font-serif text-3xl leading-none">
          {filled}/{total}
        </p>
      </div>
    </div>
  );
}

export function GuestLoyalty({ qrToken }: { qrToken?: string }) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<LoyaltyResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const query = new URLSearchParams({ locale });
      if (qrToken) query.set("qr", qrToken);
      const res = await fetch(`/api/guest/loyalty?${query}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) setData(await res.json());
    })();
  }, [qrToken, locale]);

  const venues = data?.venues ?? [];
  const googleHref = qrToken
    ? `/api/guest/auth/google?qr=${encodeURIComponent(qrToken)}`
    : "/api/guest/auth/google";

  return (
    <div className="space-y-4">
      <div>
        <p className="page-kicker">{t("loyaltyKicker")}</p>
        <h2 className="mt-1 font-serif text-3xl">{t("loyaltyTitle")}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("loyaltyIntro")}</p>
      </div>

      {!data ? (
        <p className="text-sm text-[var(--muted)]">{t("connecting")}</p>
      ) : !data.linked ? (
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">{t("loyaltyNeedGoogle")}</p>
          {data.googleAuth ? (
            <GoogleJoinButton
              className="mt-4"
              href={googleHref}
              label={qrToken ? t("joinGoogle") : t("joinGoogleHome")}
            />
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("googleUnavailable")}
            </p>
          )}
        </Card>
      ) : !venues.length ? (
        <p className="text-sm text-[var(--muted)]">{t("loyaltyEmptyVenues")}</p>
      ) : (
        venues.map((venue) => (
          <Card key={venue.venueId} className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              {venue.logoUrl ? (
                <div className="photo-box h-8 w-8 rounded-full border border-[var(--line)] bg-white">
                  <img src={venue.logoUrl} alt="" />
                </div>
              ) : null}
              <h3 className="font-serif text-2xl">{venue.venueName}</h3>
            </div>
            {!venue.enabled || !venue.item ? (
              <p className="text-sm text-[var(--muted)]">{t("loyaltyNoItem")}</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {venue.item.imageUrl ? (
                    <div className="photo-box h-12 w-12 rounded-2xl border border-[var(--line)] bg-white">
                      <img src={venue.item.imageUrl} alt="" />
                    </div>
                  ) : null}
                  <p className="text-sm text-[var(--muted)]">
                    {t("loyaltyNeed", { item: venue.item.name })}
                  </p>
                </div>
                <PunchRing filled={venue.filled} total={venue.threshold} />
                {venue.complete ? (
                  <p className="text-center text-sm font-medium text-[var(--accent)]">
                    {t("loyaltyReady")}
                  </p>
                ) : null}
                {venue.rewards > 0 ? (
                  <p className="text-center text-sm text-[var(--muted)]">
                    {t("loyaltyEarned", { n: venue.rewards })}
                  </p>
                ) : null}
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
