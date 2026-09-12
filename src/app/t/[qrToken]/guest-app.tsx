"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderBadge } from "@/components/ui/badge";
import { Popup } from "@/components/ui/popup";
import { askAlertPermission, pingPhone } from "@/lib/phone-alert";
import { usePoll } from "@/lib/poll";
import { formatTRY } from "@/lib/utils";
import { tableLabel } from "@/lib/table-label";
import type { OrderStatus } from "@prisma/client";
import { SessionFeedbackForm } from "@/components/session-feedback-form";
import { AllergenFilter } from "@/components/allergen-filter";
import { GuestGames } from "@/components/guest-games";
import { GuestHistory } from "@/components/guest-history";
import { GuestLoyalty } from "@/components/guest-loyalty";
import { GoogleJoinButton } from "@/components/google-join-button";
import { CalorieBesidePrice, NutritionLabels } from "@/components/nutrition-labels";
import {
  itemHiddenByFilter,
  type AllergenId,
} from "@/lib/nutrition";
import { isAndroidDevice, openAndroidWifiConnect } from "@/lib/wifi";
import { LanguageSwitch } from "@/components/language-switch";
import { LocaleProvider, useLocale } from "@/components/locale-provider";
import { pickLocalized, type Locale } from "@/lib/i18n";
import {
  GAME_NOTICE_CODES,
  isGuestNoticeCode,
  renderGuestNotice,
  type GuestNoticeVars,
} from "@/lib/i18n-guest";

type MenuItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  description: string | null;
  descriptionEn?: string | null;
  price: number;
  imageUrl: string | null;
  soldOut: boolean;
  allergens: AllergenId[];
  animalSource: string | null;
  containsAlcohol: boolean;
  containsPork: boolean;
  calories: number | null;
  optionGroups: {
    id: string;
    name: string;
    nameEn?: string | null;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: { id: string; name: string; nameEn?: string | null; priceDelta: number }[];
  }[];
};

type Category = {
  id: string;
  name: string;
  nameEn?: string | null;
  items: MenuItem[];
};

type EnglishOverlay = Record<
  string,
  { nameEn?: string | null; descriptionEn?: string | null }
>;

function localizeItem(item: MenuItem, locale: Locale, overlay: EnglishOverlay) {
  const extra = overlay[item.id];
  return {
    ...item,
    name: pickLocalized(locale, item.name, extra?.nameEn ?? item.nameEn),
    description:
      pickLocalized(
        locale,
        item.description,
        extra?.descriptionEn ?? item.descriptionEn,
      ) || null,
    optionGroups: item.optionGroups.map((group) => ({
      ...group,
      name: pickLocalized(
        locale,
        group.name,
        overlay[group.id]?.nameEn ?? group.nameEn,
      ),
      options: group.options.map((option) => ({
        ...option,
        name: pickLocalized(
          locale,
          option.name,
          overlay[option.id]?.nameEn ?? option.nameEn,
        ),
      })),
    })),
  };
}

function localizeCategory(
  category: Category,
  locale: Locale,
  overlay: EnglishOverlay,
) {
  return {
    ...category,
    name: pickLocalized(
      locale,
      category.name,
      overlay[category.id]?.nameEn ?? category.nameEn,
    ),
    items: category.items.map((item) => localizeItem(item, locale, overlay)),
  };
}

type CartResponse = {
  items: {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    note: string | null;
    imageUrl: string | null;
    available: boolean;
    options: { id: string; name: string; nameEn?: string | null; priceDelta: number }[];
  }[];
};

type OrdersResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    items: { id: string; menuItemId?: string; name: string; price: number; quantity: number; note: string | null; complimentary?: boolean; options?: string[] }[];
  }[];
};

type BillResponse = {
  currentGuestId: string;
  guests: { id: string; nickname: string; isMe: boolean }[];
  lines: {
    id: string;
    menuItemId?: string;
    guestId: string;
    guestName: string;
    name: string;
    price: number;
    quantity: number;
    note: string | null;
    status: OrderStatus;
    complimentary?: boolean;
    options?: string[];
  }[];
  total: number;
};

type LoyaltyLive = {
  linked: boolean;
  enabled: boolean;
  available: number;
  item: { id: string; name: string; imageUrl: string | null } | null;
};

type Area = "hub" | "menu" | "play" | "history" | "loyalty";
type Tab = "menu" | "cart" | "bill" | "alerts";

type NotesResponse = {
  unread: number;
  notifications: {
    id: string;
    title: string;
    body: string;
    code?: string | null;
    vars?: GuestNoticeVars | null;
    read: boolean;
    createdAt: string;
  }[];
};

function noticeVars(value: NotesResponse["notifications"][number]["vars"]) {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GuestNoticeVars;
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) return value;
  return undefined;
}

function localizedNotice(
  locale: Locale,
  item: NotesResponse["notifications"][number],
) {
  if (!isGuestNoticeCode(item.code)) {
    return { title: item.title, body: item.body };
  }
  return renderGuestNotice(locale, item.code, noticeVars(item.vars));
}

function guestStorageKey(qr: string) {
  return `masaqr.guest.${qr}`;
}

function pageWasReloaded() {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (nav?.type === "reload" || nav?.type === "back_forward") return true;
  return false;
}

function GuestWifiCard({
  wifiName,
  wifiPassword,
  className = "",
}: {
  wifiName?: string | null;
  wifiPassword?: string | null;
  className?: string;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  if (!wifiName) return null;

  function copyAndConnect() {
    const text = wifiPassword || wifiName || "";
    const write = navigator.clipboard.writeText(text);
    if (isAndroidDevice()) {
      openAndroidWifiConnect();
    }
    void write.then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setCopied(false),
    );
  }

  return (
    <button
      type="button"
      onClick={copyAndConnect}
      className={`block w-full text-left ${className}`}
    >
      <Card className="wifi-card overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <span className="wifi-card-icon" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 10.5c4.2-4 9.8-4 14 0" strokeLinecap="round" />
              <path d="M7.8 13.6c2.6-2.5 5.8-2.5 8.4 0" strokeLinecap="round" />
              <path d="M10.6 16.6c1.1-1 2.7-1 3.8 0" strokeLinecap="round" />
              <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="page-kicker">{t("wifiTitle")}</p>
            <p className="mt-1 truncate font-medium">{wifiName}</p>
            {wifiPassword ? (
              <p className="mt-1 break-all text-sm text-[var(--muted)]">
                {t("wifiPassword")}{" "}
                <span className="font-medium text-[var(--ink)]">{wifiPassword}</span>
                {copied ? (
                  <span className="ml-2 whitespace-nowrap text-xs font-semibold text-[var(--accent)]">
                    {t("wifiCopied")}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {copied ? t("wifiCopied") : t("wifiOpen")}
              </p>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}

function GuestBrand({
  venueName,
  venueTagline,
  venueLogo,
  venueCover,
  tableNumber,
  compact,
  children,
}: {
  venueName: string;
  venueTagline?: string | null;
  venueLogo?: string | null;
  venueCover?: string | null;
  tableNumber: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div>
      {venueCover ? (
        <div className={`photo-box w-full ${compact ? "h-24" : "h-32"}`}>
          <img src={venueCover} alt="" />
        </div>
      ) : (
        <div
          className={`w-full ${compact ? "h-16" : "h-24"}`}
          style={{
            background:
              "linear-gradient(135deg, #ff5a3c 0%, #e23b2c 45%, #e89b1a 100%)",
          }}
        />
      )}
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          {venueLogo ? (
            <div className="photo-box h-12 w-12 rounded-full border border-[var(--line)] bg-white">
              <img src={venueLogo} alt={venueName} />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              {venueName}
            </p>
            {venueTagline ? (
              <p className="text-sm text-[var(--muted)]">{venueTagline}</p>
            ) : null}
            <h1 className="text-3xl">{tableLabel(tableNumber, t("tableWord"))}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function HubBubble({
  title,
  hint,
  image,
  wide,
  onClick,
}: {
  title: string;
  hint: string;
  image: string;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`hub-bubble${wide ? " hub-bubble-wide" : ""}`}
      onClick={onClick}
    >
      <span className="hub-bubble-photo">
        <img src={image} alt="" />
      </span>
      <span className="hub-bubble-fade" />
      <span className="hub-bubble-copy">
        <span className="font-serif text-3xl leading-none text-[var(--ink)]">
          {title}
        </span>
        <span className="mt-1 text-center text-xs leading-snug text-[var(--muted)]">
          {hint}
        </span>
      </span>
    </button>
  );
}

function GuestWelcomeHub({
  venueName,
  venueTagline,
  venueLogo,
  venueCover,
  tableNumber,
  guestName,
  guests,
  hoursLabel,
  wifiName,
  wifiPassword,
  onMenu,
  onPlay,
  onHistory,
  onLoyalty,
}: {
  venueName: string;
  venueTagline?: string | null;
  venueLogo?: string | null;
  venueCover?: string | null;
  tableNumber: string;
  guestName: string;
  guests?: { nickname: string; isMe: boolean }[];
  hoursLabel: string;
  wifiName?: string | null;
  wifiPassword?: string | null;
  onMenu: () => void;
  onPlay: () => void;
  onHistory: () => void;
  onLoyalty: () => void;
}) {
  const { t, dir } = useLocale();
  const tableGuests = guests ?? [];
  const guestNames =
    tableGuests.length > 1
      ? tableGuests
          .map((guest) =>
            guest.isMe ? `${guest.nickname}${t("youParen")}` : guest.nickname,
          )
          .join(" · ")
      : "";
  return (
    <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col">
      <div className="relative">
        {venueCover ? (
          <div className="photo-box h-[44vh] min-h-64 w-full">
            <img src={venueCover} alt="" />
          </div>
        ) : (
          <div
            className="h-[44vh] min-h-64 w-full"
            style={{
              background:
                "linear-gradient(145deg, #ff5a3c 0%, #e23b2c 42%, #e89b1a 100%)",
            }}
          />
        )}
        <div className="hub-cover-fade pointer-events-none absolute inset-0" />
        <div className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="rounded-full bg-white/80 px-1 py-1 shadow-sm backdrop-blur-md">
            <LanguageSwitch />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-1">
          <div className="flex items-end gap-3">
            {venueLogo ? (
              <div className="photo-box h-16 w-16 rounded-[1.35rem] border-2 border-white bg-white shadow-lg">
                <img src={venueLogo} alt={venueName} />
              </div>
            ) : null}
            <div className="min-w-0 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                {venueName}
              </p>
              {venueTagline ? (
                <p className="mt-0.5 text-sm text-[var(--ink)]/70">{venueTagline}</p>
              ) : null}
              <h1 className="font-serif text-4xl text-[var(--ink)]">
                {tableLabel(tableNumber, t("tableWord"))}
              </h1>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <p className="text-sm text-[var(--muted)]">{t("hubWelcome")}</p>
        <p className="font-serif text-3xl">{t("hello", { name: guestName })}</p>
        {guestNames ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            {t("hubGuests", { names: guestNames })}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-[var(--muted)]">{t("hubPick")}</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <HubBubble
            title={t("tabMenu")}
            hint={t("hubMenuHint")}
            image="/guest/hub-menu.png"
            onClick={onMenu}
          />
          <HubBubble
            title={t("hubPlay")}
            hint={t("hubPlayHint")}
            image="/guest/hub-play.png"
            onClick={onPlay}
          />
          <HubBubble
            title={t("hubHistory")}
            hint={t("hubHistoryHint")}
            image="/guest/hub-history.png"
            onClick={onHistory}
          />
          <HubBubble
            title={t("hubLoyalty")}
            hint={t("hubLoyaltyHint")}
            image="/guest/hub-loyalty.svg"
            onClick={onLoyalty}
          />
        </div>
        <p className="mt-6 rounded-2xl bg-black/5 px-4 py-3 text-sm text-[var(--muted)]">
          {hoursLabel}
        </p>
        <GuestWifiCard
          className="mt-3"
          wifiName={wifiName}
          wifiPassword={wifiPassword}
        />
      </div>
    </div>
  );
}

function SectionLogo({
  src,
  label,
}: {
  src?: string | null;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {src ? (
        <div className="photo-box h-7 w-7 rounded-full border border-[var(--line)] bg-white">
          <img src={src} alt="" />
        </div>
      ) : null}
      <h2 className="text-2xl">{label}</h2>
    </div>
  );
}

function MenuDish({
  item,
  action,
  highlight,
}: {
  item: MenuItem;
  action?: ReactNode;
  highlight?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card
      className={`flex items-start gap-3 overflow-hidden p-3 ${highlight ? "dish-added" : ""}`}
    >
      {item.imageUrl ? (
        <div className="photo-box h-16 w-16 rounded-xl sm:h-20 sm:w-20">
          <img src={item.imageUrl} alt="" />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-xs text-[var(--muted)] sm:h-20 sm:w-20">
          {item.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.name}</p>
        {item.description ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
        ) : null}
        <CalorieBesidePrice
          price={formatTRY(item.price)}
          calories={item.calories}
        />
        <NutritionLabels item={item} compact />
        {item.soldOut ? (
          <p className="mt-1 text-xs font-semibold text-red-700">{t("soldOut")}</p>
        ) : null}
      </div>
      {action}
    </Card>
  );
}

type GuestAppProps = {
  qrToken: string;
  venueName: string;
  venueTagline?: string | null;
  venueLogo?: string | null;
  venueCover?: string | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  tableNumber: string;
  categories: Category[];
  openState: {
    isOpen: boolean;
    hoursUnset?: boolean;
    closedToday?: boolean;
    closesAt?: string | null;
    opensAt?: string | null;
  };
  staffPreview?: boolean;
};

export function GuestApp(props: GuestAppProps) {
  return (
    <LocaleProvider>
      <GuestAppContent {...props} />
    </LocaleProvider>
  );
}

function GuestAppContent({
  qrToken,
  venueName,
  venueTagline,
  venueLogo,
  venueCover,
  wifiName,
  wifiPassword,
  tableNumber,
  categories,
  openState,
  staffPreview = false,
}: GuestAppProps) {
  const { t, dir, dateLocale, locale } = useLocale();
  const hoursLabel = openState.hoursUnset
    ? t("hoursUnset")
    : openState.closedToday
      ? t("closedToday")
      : openState.isOpen
        ? t("openUntil", { time: openState.closesAt ?? "" })
        : t("closedUntil", { time: openState.opensAt ?? "" });
  const [area, setArea] = useState<Area>("hub");
  const [tab, setTab] = useState<Tab>("menu");
  const [gameImmersive, setGameImmersive] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [guestId, setGuestId] = useState("");
  const [guestToken, setGuestToken] = useState("");
  const [name, setName] = useState("");
  const [named, setNamed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [alertPopup, setAlertPopup] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [calling, setCalling] = useState(false);
  const [waiterConfirmOpen, setWaiterConfirmOpen] = useState(false);
  const [billConfirmOpen, setBillConfirmOpen] = useState(false);
  const [localWaiterCooldownUntil, setLocalWaiterCooldownUntil] = useState(0);
  const [localBillCooldownUntil, setLocalBillCooldownUntil] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [cartPulse, setCartPulse] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [configuringItem, setConfiguringItem] = useState<MenuItem | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [joinClosed, setJoinClosed] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [useTreat, setUseTreat] = useState(false);
  const seenAlert = useRef<string | null>(null);
  const noteTimers = useRef<Record<string, number>>({});
  const pendingOrderKey = useRef<string | null>(null);
  const [hideAllergens, setHideAllergens] = useState<AllergenId[]>([]);
  const [hideAlcohol, setHideAlcohol] = useState(false);
  const [hidePork, setHidePork] = useState(false);
  const [enOverlay, setEnOverlay] = useState<EnglishOverlay>({});
  const fetchedEn = useRef(false);
  const visibleCategories = useMemo(
    () =>
      categories
        .map((category) =>
          localizeCategory(
            {
              ...category,
              items: category.items.filter(
                (item) =>
                  !itemHiddenByFilter(item, hideAllergens, hideAlcohol, hidePork),
              ),
            },
            locale,
            enOverlay,
          ),
        )
        .filter((category) => category.items.length > 0),
    [categories, hideAllergens, hideAlcohol, hidePork, locale, enOverlay],
  );
  const menuNames = useMemo(() => {
    const names = new Map<string, string>();
    const optionNames = new Map<string, string>();
    for (const category of categories) {
      const localized = localizeCategory(category, locale, enOverlay);
      category.items.forEach((item, itemIndex) => {
        const localizedItem = localized.items[itemIndex];
        names.set(item.id, localizedItem.name);
        item.optionGroups.forEach((group, groupIndex) => {
          const localizedGroup = localizedItem.optionGroups[groupIndex];
          optionNames.set(group.id, localizedGroup.name);
          optionNames.set(group.name, localizedGroup.name);
          group.options.forEach((option, optionIndex) => {
            const localizedOption = localizedGroup.options[optionIndex];
            optionNames.set(option.id, localizedOption.name);
            optionNames.set(option.name, localizedOption.name);
          });
        });
      });
    }
    return { names, optionNames };
  }, [categories, locale, enOverlay]);
  const localizedStaffCategories = useMemo(
    () =>
      categories.map((category) =>
        localizeCategory(category, locale, enOverlay),
      ),
    [categories, locale, enOverlay],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const google = new URLSearchParams(window.location.search).get("google");
    if (google === "error") setNameError(t("googleFail"));
    if (google === "off") setNameError(t("googleUnavailable"));
  }, [t]);

  useEffect(() => {
    if (locale !== "en" || fetchedEn.current) return;
    const missing = categories.some(
      (category) =>
        !category.nameEn ||
        category.items.some(
          (item) =>
            !item.nameEn ||
            (item.description && !item.descriptionEn) ||
            item.optionGroups.some(
              (group) =>
                !group.nameEn ||
                group.options.some((option) => !option.nameEn),
            ),
        ),
    );
    if (!missing) return;
    fetchedEn.current = true;
    let cancelled = false;
    fetch("/api/guest/menu-en", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { categories?: { id: string; nameEn?: string | null }[]; items?: { id: string; nameEn?: string | null; descriptionEn?: string | null }[]; options?: { id: string; nameEn?: string | null }[] } | null) => {
        if (cancelled || !data) return;
        const next: EnglishOverlay = {};
        for (const category of data.categories ?? []) {
          next[category.id] = { nameEn: category.nameEn };
        }
        for (const item of data.items ?? []) {
          next[item.id] = {
            nameEn: item.nameEn,
            descriptionEn: item.descriptionEn,
          };
        }
        for (const option of data.options ?? []) {
          next[option.id] = { nameEn: option.nameEn };
        }
        setEnOverlay(next);
      })
      .catch(() => {
        fetchedEn.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [locale, qrToken, categories]);

  useEffect(() => {
    if (staffPreview) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function boot() {
      try {
        const saved =
          typeof window !== "undefined"
            ? window.localStorage.getItem(guestStorageKey(qrToken))
            : null;
        const freshScan = !pageWasReloaded();
        const res = await fetch("/api/guest/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(saved ? { "x-guest-token": saved } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            qr: qrToken,
            guestToken: saved,
            preview: staffPreview,
            freshScan,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.staffPreview) {
          setReady(true);
          return;
        }
        if (!res.ok) {
          setNameError(data.error ?? t("joinFail"));
          return;
        }
        if (data.closed) {
          if (data.guestToken) {
            setGuestId(data.guestId ?? "");
            setGuestToken(data.guestToken);
            window.localStorage.setItem(
              guestStorageKey(qrToken),
              data.guestToken,
            );
          }
          if (data.closedAt) setClosedAt(data.closedAt);
          setJoinClosed(true);
          setReady(true);
          return;
        }
        if (data.googleAuth != null) setGoogleAuth(Boolean(data.googleAuth));
        if (data.idle || !data.guestToken) {
          window.localStorage.removeItem(guestStorageKey(qrToken));
          setGuestId("");
          setGuestToken("");
          setJoinClosed(false);
          setNamed(false);
          if (data.customerName) setName(data.customerName);
          setReady(true);
          return;
        }
        setGuestId(data.guestId);
        setGuestToken(data.guestToken);
        window.localStorage.setItem(guestStorageKey(qrToken), data.guestToken);
        if (data.nickname) {
          setName(data.nickname);
        }
        setNamed(true);
        setReady(true);
      } catch {
        if (!cancelled) {
          setNameError(t("offlineWifi"));
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [qrToken, staffPreview]);

  type LiveResponse = {
    guest?: {
      waiterCooldownUntil: string | null;
      billCooldownUntil?: string | null;
    };
    cart: CartResponse;
    orders: OrdersResponse;
    bill: BillResponse;
    loyalty?: LoyaltyLive;
    notes: NotesResponse;
  };

  const { data: live, setData: setLive } = usePoll<LiveResponse>(
    ready && named && guestToken && !joinClosed ? "/api/guest/live" : null,
    5000,
    guestToken,
  );
  type SessionStatusResponse = {
    closed: boolean;
    venueName?: string;
    tableNumber?: string;
    closedAt?: string | null;
    receiptSent?: boolean;
    feedbackSubmitted?: boolean;
    lines?: {
      id: string;
      menuItemId?: string;
      name: string;
      quantity: number;
      price: number;
      options: string[];
    }[];
    total?: number;
  };
  const { data: sessionStatus, setData: setSessionStatus } = usePoll<SessionStatusResponse>(
    ready && guestToken ? "/api/guest/session-status" : null,
    5000,
    guestToken,
  );

  useEffect(() => {
    if (!(joinClosed || sessionStatus?.closed)) return;
    if (feedbackDone || sessionStatus?.feedbackSubmitted) return;
    const stamp = sessionStatus?.closedAt ?? closedAt;
    const closedMs = stamp ? new Date(stamp).getTime() : null;
    const started = closedMs && !Number.isNaN(closedMs) ? closedMs : Date.now();
    const deadline = started + 60_000;
    const leave = () => {
      if (Date.now() < deadline) return;
      window.localStorage.removeItem(guestStorageKey(qrToken));
      window.location.replace("/");
    };
    leave();
    const timer = window.setInterval(leave, 1000);
    return () => window.clearInterval(timer);
  }, [
    joinClosed,
    sessionStatus?.closed,
    sessionStatus?.closedAt,
    sessionStatus?.feedbackSubmitted,
    feedbackDone,
    closedAt,
    qrToken,
  ]);
  const cart = live?.cart ?? null;
  const orders = live?.orders;
  const bill = live?.bill;
  const notes = live?.notes;
  const loyalty = live?.loyalty;
  const serverWaiterCooldownUntil = live?.guest?.waiterCooldownUntil
    ? new Date(live.guest.waiterCooldownUntil).getTime()
    : 0;
  const waiterCooldownUntil = Math.max(
    localWaiterCooldownUntil,
    serverWaiterCooldownUntil,
  );
  const waiterCooldownSeconds = Math.max(
    0,
    Math.ceil((waiterCooldownUntil - nowMs) / 1000),
  );
  const waiterCooldownLabel = `${Math.floor(waiterCooldownSeconds / 60)}:${String(
    waiterCooldownSeconds % 60,
  ).padStart(2, "0")}`;
  const serverBillCooldownUntil = live?.guest?.billCooldownUntil
    ? new Date(live.guest.billCooldownUntil).getTime()
    : 0;
  const billCooldownUntil = Math.max(
    localBillCooldownUntil,
    serverBillCooldownUntil,
  );
  const billCooldownSeconds = Math.max(
    0,
    Math.ceil((billCooldownUntil - nowMs) / 1000),
  );

  function setCart(next: CartResponse) {
    setLive((current) =>
      current
        ? { ...current, cart: next }
        : {
            cart: next,
            orders: { orders: [] },
            bill: { currentGuestId: "", guests: [], lines: [], total: 0 },
            notes: { unread: 0, notifications: [] },
          },
    );
  }

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartTotal = cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;

  const groupedBill = useMemo(() => {
    const map = new Map<string, BillResponse["lines"]>();
    for (const line of bill?.lines ?? []) {
      const list = map.get(line.guestId) ?? [];
      list.push(line);
      map.set(line.guestId, list);
    }
    return map;
  }, [bill]);

  useEffect(() => {
    if (!loyalty?.available) setUseTreat(false);
  }, [loyalty?.available]);

  function guestHeaders(json = false) {
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(guestToken ? { "x-guest-token": guestToken } : {}),
    };
  }

  async function addToCart(menuItemId: string, optionIds: string[] = []) {
    setFlash(false);
    window.requestAnimationFrame(() => setFlash(true));
    setAddedId(menuItemId);
    setCartPulse(true);
    setMessage(t("addedToCart"));
    window.setTimeout(() => setCartPulse(false), 1400);
    window.setTimeout(() => setFlash(false), 700);
    window.setTimeout(() => setAddedId(null), 900);
    setBusy(true);
    const res = await fetch("/api/guest/cart", {
      method: "POST",
      headers: guestHeaders(true),
      credentials: "include",
      body: JSON.stringify({ menuItemId, quantity: 1, optionIds }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error ?? t("addFailed"));
      return;
    }
    const refreshed = await fetch("/api/guest/cart", {
      credentials: "include",
      headers: guestHeaders(),
    });
    if (refreshed.ok) setCart(await refreshed.json());
  }

  function toggleOption(
    group: MenuItem["optionGroups"][number],
    optionId: string,
  ) {
    setSelectedOptionIds((current) => {
      if (current.includes(optionId)) {
        return current.filter((id) => id !== optionId);
      }
      if (group.maxSelections === 1) {
        const groupIds = new Set(group.options.map((option) => option.id));
        return [...current.filter((id) => !groupIds.has(id)), optionId];
      }
      const selectedInGroup = group.options.filter((option) =>
        current.includes(option.id),
      ).length;
      if (selectedInGroup >= group.maxSelections) return current;
      return [...current, optionId];
    });
  }

  function configurationValid(item: MenuItem) {
    return item.optionGroups.every((group) => {
      const count = group.options.filter((option) =>
        selectedOptionIds.includes(option.id),
      ).length;
      const minimum = group.required
        ? Math.max(1, group.minSelections)
        : group.minSelections;
      return count >= minimum && count <= group.maxSelections;
    });
  }

  async function emailReceipt() {
    setReceiptBusy(true);
    setMessage(null);
    const response = await fetch("/api/guest/receipt", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ email: receiptEmail }),
    });
    const data = await response.json().catch(() => ({}));
    setReceiptBusy(false);
    setMessage(
      response.ok
        ? t("receiptSaved")
        : data.error ?? t("receiptFail"),
    );
  }

  async function refreshCart() {
    const refreshed = await fetch("/api/guest/cart", {
      credentials: "include",
      headers: guestHeaders(),
    });
    if (refreshed.ok) setCart(await refreshed.json());
  }

  async function updateQty(id: string, quantity: number) {
    if (quantity < 1) {
      await fetch(`/api/guest/cart/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: guestHeaders(),
      });
    } else {
      await fetch(`/api/guest/cart/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: guestHeaders(true),
        body: JSON.stringify({ quantity }),
      });
    }
    await refreshCart();
  }

  function setNoteDraft(id: string, note: string) {
    setNoteDrafts((current) => ({ ...current, [id]: note }));
    window.clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = window.setTimeout(() => {
      void fetch(`/api/guest/cart/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: guestHeaders(true),
        body: JSON.stringify({ note: note.trim() || null }),
      });
    }, 400);
  }

  async function callWaiter() {
    setWaiterConfirmOpen(false);
    setCalling(true);
    const res = await fetch("/api/guest/call-waiter", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    setCalling(false);
    if (data.cooldownUntil) {
      setLocalWaiterCooldownUntil(new Date(data.cooldownUntil).getTime());
    }
    if (!res.ok) {
      setMessage(data.error ?? t("waiterFail"));
      return;
    }
    setMessage(data.message ?? t("waiterOk"));
  }

  async function requestBill() {
    setBillConfirmOpen(false);
    setCalling(true);
    const res = await fetch("/api/guest/request-bill", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    setCalling(false);
    if (data.cooldownUntil) {
      setLocalBillCooldownUntil(new Date(data.cooldownUntil).getTime());
    }
    if (!res.ok) {
      setMessage(data.error ?? t("billFail"));
      return;
    }
    setMessage(data.message ?? t("billOk"));
  }

  async function submitOrder() {
    setBusy(true);
    setMessage(null);
    await Promise.all(
      Object.entries(noteDrafts).map(([id, note]) =>
        fetch(`/api/guest/cart/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: guestHeaders(true),
          body: JSON.stringify({ note: note.trim() || null }),
        }),
      ),
    );
    const idempotencyKey = pendingOrderKey.current ?? crypto.randomUUID();
    pendingOrderKey.current = idempotencyKey;
    try {
      const res = await fetch("/api/guest/orders", {
        method: "POST",
        credentials: "include",
        headers: guestHeaders(true),
        body: JSON.stringify({ idempotencyKey, useLoyalty: useTreat }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        pendingOrderKey.current = null;
        setMessage(json.error ?? t("orderFail"));
        return;
      }
      pendingOrderKey.current = null;
      setCart({ items: [] });
      setUseTreat(false);
      setArea("menu");
      setTab("cart");
      setMessage(t("orderSent"));
    } catch {
      setMessage(t("orderOffline"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelOwnOrder() {
    if (!cancelOrderId) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/guest/orders/${cancelOrderId}`, {
      method: "PATCH",
      credentials: "include",
      headers: guestHeaders(true),
      body: JSON.stringify({ action: "cancel" }),
    });
    const json = await response.json().catch(() => ({}));
    setCancelOrderId(null);
    setBusy(false);
    if (!response.ok) {
      setMessage(json.error ?? t("cancelFail"));
      return;
    }
    setMessage(t("orderCancelled"));
    const refreshed = await fetch("/api/guest/live", {
      cache: "no-store",
      credentials: "include",
      headers: guestHeaders(),
    });
    if (refreshed.ok) setLive(await refreshed.json());
  }

  async function sitDown(nickname?: string) {
    const saved =
      guestToken ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem(guestStorageKey(qrToken))
        : null);
    const res = await fetch("/api/guest/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(saved ? { "x-guest-token": saved } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        qr: qrToken,
        guestToken: saved,
        sit: true,
        ...(nickname ? { nickname } : {}),
        freshScan: !pageWasReloaded(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.staffPreview || data.closed || data.idle || !data.guestToken) {
      if (data.closed) {
        setJoinClosed(true);
      }
      return null;
    }
    setGuestId(data.guestId);
    setGuestToken(data.guestToken);
    window.localStorage.setItem(guestStorageKey(qrToken), data.guestToken);
    if (data.nickname) setName(data.nickname);
    return data.guestToken as string;
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError(t("nameMin"));
      return;
    }
    setBusy(true);
    setNameError(null);
    try {
      const token = guestToken || (await sitDown(trimmed));
      if (!token) {
        setNameError(t("sessionClosed"));
        return;
      }
      const res = await fetch("/api/guest/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-guest-token": token } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNameError(data.error ?? t("nameSaveFail"));
        return;
      }
      setName(trimmed);
      setNamed(true);
      void askAlertPermission();
    } catch {
      setNameError(t("nameSaveOffline"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (named) void askAlertPermission();
  }, [named]);

  useEffect(() => {
    const latest = notes?.notifications.find((item) => !item.read);
    if (!latest || latest.id === seenAlert.current) return;
    seenAlert.current = latest.id;
    const copy = localizedNotice(locale, latest);
    pingPhone(copy.title, copy.body);
    if (isGuestNoticeCode(latest.code) && GAME_NOTICE_CODES.has(latest.code)) {
      setArea("play");
      return;
    }
    setArea("menu");
    setMessage(`${copy.title}: ${copy.body}`);
    setAlertPopup({ title: copy.title, body: copy.body });
  }, [notes, locale]);

  const unread = notes?.unread ?? 0;

  async function openAlerts() {
    setArea("menu");
    setTab("alerts");
    if (!unread) return;
    await fetch("/api/guest/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: guestHeaders(),
    });
  }

  const shownName = name.trim() || t("guestDefault");
  const tabs = [
    ["menu", t("tabMenu")],
    ["cart", cartCount ? t("tabCartN", { n: cartCount }) : t("tabCart")],
    ["bill", t("tabBill")],
    ["alerts", unread ? t("tabAlertsN", { n: unread }) : t("tabAlerts")],
  ] as const;

  if (staffPreview) {
    return (
      <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
        >
          <LanguageSwitch className="mt-3" />
          <p className="mt-2 rounded-xl bg-black/5 px-3 py-2 text-sm">
            {t("staffPreview")}
          </p>
        </GuestBrand>
        <GuestWifiCard
          className="mx-4"
          wifiName={wifiName}
          wifiPassword={wifiPassword}
        />
        <div className="space-y-8 px-4 py-6">
          {localizedStaffCategories.map((category) => (
            <section key={category.id}>
              <h2 className="text-2xl">{category.name}</h2>
              <div className="mt-3 space-y-3">
                {category.items.map((item) => (
                  <MenuDish key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col justify-center px-5">
        <LanguageSwitch className="mb-6" />
        <p className="text-[var(--muted)]">
          {nameError ?? t("connecting")}
        </p>
      </div>
    );
  }

  if (joinClosed || sessionStatus?.closed) {
    return (
      <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col px-4 py-8">
        <LanguageSwitch className="mb-4 justify-center" />
        <div className="text-center">
          <p className="page-kicker">{sessionStatus?.venueName ?? venueName}</p>
          <h1 className="mt-2 font-serif text-4xl">{t("thanks")}</h1>
          <p className="mt-2 text-[var(--muted)]">
            {t("billClosed", {
              table: tableLabel(
                sessionStatus?.tableNumber ?? tableNumber,
                t("tableWord"),
              ),
            })}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {t("rescanHint")}
          </p>
        </div>
        {nameError ? (
          <p className="mt-2 text-center text-sm text-red-700">{nameError}</p>
        ) : null}
        {(sessionStatus?.lines?.length ?? 0) > 0 ? (
        <Card className="mt-6 p-5">
          <h2 className="font-serif text-2xl">{t("billSummary")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(sessionStatus?.lines ?? []).map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>
                  {line.quantity}×{" "}
                  {menuNames.names.get(line.menuItemId ?? "") ?? line.name}
                  {line.options.length
                    ? ` · ${line.options
                        .map((name) => menuNames.optionNames.get(name) ?? name)
                        .join(", ")}`
                    : ""}
                </span>
                <span>{formatTRY(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--line)] pt-3 text-right font-medium">
            {t("total", { amount: formatTRY(sessionStatus?.total ?? 0) })}
          </p>
          {sessionStatus?.receiptSent ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {t("receiptSent")}
            </p>
          ) : null}
        </Card>
        ) : null}
        {guestToken && !sessionStatus?.feedbackSubmitted && !feedbackDone ? (
          <Card className="mt-4 p-5">
            <SessionFeedbackForm
              onSubmitted={() => setFeedbackDone(true)}
            />
          </Card>
        ) : guestToken ? (
          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            {t("feedbackThanks")}
          </p>
        ) : null}
      </div>
    );
  }

  if (!named) {
    return (
      <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
        >
          <LanguageSwitch className="mt-3" />
        </GuestBrand>
        <GuestWifiCard
          className="mx-4 mt-1"
          wifiName={wifiName}
          wifiPassword={wifiPassword}
        />
        <div className="flex flex-1 flex-col justify-center px-5">
          <h2 className="text-3xl">{t("joinTitle")}</h2>
          <p className="mt-2 text-[var(--muted)]">
            {t("joinBody")}
          </p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={40}
              enterKeyHint="done"
            />
            {nameError ? <p className="text-sm text-red-700">{nameError}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? t("saving") : t("joinNamed")}
            </Button>
          </form>
          {googleAuth ? (
            <GoogleJoinButton
              className="mt-3"
              href={`/api/guest/auth/google?qr=${encodeURIComponent(qrToken)}`}
              label={t("joinGoogle")}
              disabled={busy}
            />
          ) : null}
          <button
            type="button"
            className="mt-4 min-h-11 text-sm text-[var(--muted)] underline-offset-4 hover:underline"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setNameError(null);
                const token = await sitDown();
                setBusy(false);
                if (!token) {
                  setNameError(t("sessionClosed"));
                  return;
                }
                setNamed(true);
              })();
            }}
          >
            {t("continueAnon")}
          </button>
        </div>
      </div>
    );
  }

  if (area === "hub") {
    return (
      <GuestWelcomeHub
        venueName={venueName}
        venueTagline={venueTagline}
        venueLogo={venueLogo}
        venueCover={venueCover}
        tableNumber={tableNumber}
        guestName={shownName}
        guests={bill?.guests}
        hoursLabel={hoursLabel}
        wifiName={wifiName}
        wifiPassword={wifiPassword}
        onMenu={() => {
          setTab("menu");
          setArea("menu");
        }}
        onPlay={() => setArea("play")}
        onHistory={() => setArea("history")}
        onLoyalty={() => setArea("loyalty")}
      />
    );
  }

  return (
    <div dir={dir} className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
      {configuringItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <Card className="max-h-[85dvh] w-full max-w-lg overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="page-kicker">{t("prepareItem")}</p>
                <h2 className="font-serif text-2xl">{configuringItem.name}</h2>
                <NutritionLabels item={configuringItem} />
                {configuringItem.calories != null ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("kcalPortion", { n: configuringItem.calories })}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfiguringItem(null)}
              >
                {t("close")}
              </Button>
            </div>
            <div className="mt-5 space-y-5">
              {configuringItem.optionGroups.map((group) => {
                const minimum = group.required
                  ? Math.max(1, group.minSelections)
                  : group.minSelections;
                return (
                  <fieldset key={group.id}>
                    <legend className="font-medium">
                      {group.name}
                      <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                        {minimum > 0 ? t("required") : t("optional")} · {t("maxN", { n: group.maxSelections })}
                      </span>
                    </legend>
                    <div className="mt-2 space-y-2">
                      {group.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type={
                                group.maxSelections === 1
                                  ? "radio"
                                  : "checkbox"
                              }
                              name={`option-${group.id}`}
                              checked={selectedOptionIds.includes(option.id)}
                              onChange={() => toggleOption(group, option.id)}
                            />
                            {option.name}
                          </span>
                          {option.priceDelta > 0 ? (
                            <span className="text-sm text-[var(--muted)]">
                              +{formatTRY(option.priceDelta)}
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={busy || !configurationValid(configuringItem)}
              onClick={async () => {
                const item = configuringItem;
                setConfiguringItem(null);
                await addToCart(item.id, selectedOptionIds);
              }}
            >
              {t("addToCart")} ·{" "}
              {formatTRY(
                configuringItem.price +
                  configuringItem.optionGroups
                    .flatMap((group) => group.options)
                    .filter((option) =>
                      selectedOptionIds.includes(option.id),
                    )
                    .reduce((sum, option) => sum + option.priceDelta, 0),
              )}
            </Button>
          </Card>
        </div>
      ) : null}
      {flash ? <div className="add-flash" /> : null}
      <header className={`sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md ${area === "play" && gameImmersive ? "hidden" : ""}`}>
        {area === "menu" ? (
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
          compact
        >
          <div className="mt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent)]"
              onClick={() => {
                setGameImmersive(false);
                setArea("hub");
              }}
            >
              {t("hubBack")}
            </button>
            <p className="text-xs text-[var(--muted)]">
              {t("guestsAtTable", { n: bill?.guests.length ?? 1 })}
            </p>
            <LanguageSwitch />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted)]">{t("hello", { name: shownName })}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={calling || waiterCooldownSeconds > 0}
              onClick={() => setWaiterConfirmOpen(true)}
            >
              {calling
                ? t("calling")
                : waiterCooldownSeconds > 0
                  ? t("callAgain", { time: waiterCooldownLabel })
                  : t("callWaiter")}
            </Button>
          </div>
          {!name.trim() ? (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void saveName();
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("nameOptional")}
                maxLength={40}
              />
              <Button type="submit" size="sm" disabled={busy || name.trim().length < 2}>
                {t("save")}
              </Button>
            </form>
          ) : null}
          {nameError ? <p className="mt-2 text-sm text-red-700">{nameError}</p> : null}
        </GuestBrand>
        ) : (
          <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-2 pb-2">
              <button
                type="button"
                className="text-sm font-semibold text-[var(--accent)]"
                onClick={() => {
                  setGameImmersive(false);
                  setArea("hub");
                }}
              >
                {t("hubBack")}
              </button>
              <p className="font-serif text-xl">
                {area === "history"
                  ? t("hubHistory")
                  : area === "loyalty"
                    ? t("hubLoyalty")
                    : t("hubPlay")}
              </p>
              <LanguageSwitch />
            </div>
          </div>
        )}
        <div className="px-4 pb-3">
        {area === "menu" ? (
        <div className="grid grid-cols-4 gap-1 rounded-full bg-black/5 p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => (key === "alerts" ? void openAlerts() : setTab(key))}
              className={`relative flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-full px-0.5 text-[11px] font-medium leading-tight sm:text-sm ${
                tab === key
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "text-[var(--ink)]"
              } ${key === "cart" && cartPulse ? "cart-pulse" : ""}`}
            >
              {label}
              {key === "cart" && cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        ) : null}
        {area === "menu" && bill?.guests.length ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {bill.guests.map((g) => (g.isMe ? `${g.nickname}${t("youParen")}` : g.nickname)).join(" · ")}
          </p>
        ) : null}
        </div>
      </header>

      {area === "menu" ? (
        <>
      <p
        className={`mx-4 mt-3 rounded-xl px-3 py-2 text-sm ${
          openState.isOpen
            ? "bg-emerald-50 text-emerald-800"
            : "bg-red-50 text-red-800"
        }`}
      >
        {hoursLabel}
      </p>

      <GuestWifiCard
        className="mx-4 mt-3"
        wifiName={wifiName}
        wifiPassword={wifiPassword}
      />

      {message ? (
        <p className="px-4 pt-3 text-sm text-[var(--accent)]">{message}</p>
      ) : null}
        </>
      ) : null}

      {area === "menu" && tab === "menu" ? (
        <div className="space-y-8 px-4 py-6">
          <AllergenFilter
            hideAllergens={hideAllergens}
            hideAlcohol={hideAlcohol}
            hidePork={hidePork}
            onChange={(next) => {
              setHideAllergens(next.hideAllergens);
              setHideAlcohol(next.hideAlcohol);
              setHidePork(next.hidePork);
            }}
          />
          <p className="text-xs text-[var(--muted)]">
            {t("allergenLegal")}
          </p>
          {!visibleCategories.length ? (
            <p className="text-sm text-[var(--muted)]">
              {t("noFilterMatch")}
            </p>
          ) : null}
          {visibleCategories.map((category) => (
            <section key={category.id}>
              <h2 className="text-2xl">{category.name}</h2>
              <div className="mt-3 space-y-3">
                {category.items.map((item) => (
                  <MenuDish
                    key={item.id}
                    item={item}
                    highlight={addedId === item.id}
                    action={
                      <Button
                        size="sm"
                        disabled={
                          item.soldOut ||
                          !openState.isOpen ||
                          (busy && addedId !== item.id)
                        }
                        onClick={() => {
                          if (item.optionGroups.length) {
                            setSelectedOptionIds([]);
                            setConfiguringItem(item);
                          } else {
                            void addToCart(item.id);
                          }
                        }}
                      >
                        {item.soldOut ? t("soldOut") : t("add")}
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {area === "menu" && tab === "cart" ? (
        <div className="space-y-4 px-4 py-6">
          <SectionLogo src={venueLogo} label={t("tabCart")} />
          {loyalty?.enabled ? (
            <Card className="space-y-3 p-4">
              <p className="page-kicker">{t("loyaltyRights")}</p>
              {!loyalty.linked ? (
                <>
                  <p className="text-sm text-[var(--muted)]">
                    {t("loyaltyNeedLoginCart")}
                  </p>
                  {googleAuth ? (
                    <GoogleJoinButton
                      href={`/api/guest/auth/google?qr=${encodeURIComponent(qrToken)}`}
                      label={t("joinGoogle")}
                    />
                  ) : null}
                </>
              ) : loyalty.available > 0 && loyalty.item ? (
                <>
                  <p className="font-serif text-2xl">
                    {t("loyaltyRightsCount", { n: loyalty.available })}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {loyalty.item.name} · {t("loyaltyGift")}
                  </p>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={useTreat}
                      onChange={(event) => setUseTreat(event.target.checked)}
                    />
                    {useTreat ? t("loyaltyUsing") : t("loyaltyUse")}
                  </label>
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  {t("loyaltyRightsNone")}
                </p>
              )}
            </Card>
          ) : null}
          {!cart?.items.length ? (
            <p className="text-[var(--muted)]">{t("cartEmpty")}</p>
          ) : (
            <>
              {cart.items.map((item) => (
                <Card key={item.id} className="overflow-hidden p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {item.imageUrl ? (
                        <div className="photo-box h-16 w-16 rounded-xl">
                          <img src={item.imageUrl} alt="" />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-xs text-[var(--muted)]">
                          {(menuNames.names.get(item.menuItemId) ?? item.name).slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">
                          {menuNames.names.get(item.menuItemId) ?? item.name}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          {formatTRY(item.price)}
                        </p>
                        {item.options.length ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {item.options
                              .map(
                                (option) =>
                                  menuNames.optionNames.get(option.id) ??
                                  pickLocalized(locale, option.name, option.nameEn),
                              )
                              .join(" · ")}
                          </p>
                        ) : null}
                        {!item.available ? (
                          <p className="mt-1 text-xs font-semibold text-red-700">
                            {t("unavailable")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateQty(item.id, item.quantity - 1)}
                      >
                        −
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!openState.isOpen || !item.available}
                        onClick={() => void updateQty(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="mt-3"
                    value={noteDrafts[item.id] ?? item.note ?? ""}
                    maxLength={140}
                    placeholder={t("notePlaceholder")}
                    onChange={(e) => setNoteDraft(item.id, e.target.value)}
                  />
                </Card>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[var(--muted)]">{t("cartYours")}</p>
                <p className="text-lg font-medium">{formatTRY(cartTotal)}</p>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={
                  busy ||
                  !openState.isOpen ||
                  Boolean(cart?.items.some((item) => !item.available))
                }
                onClick={() => void submitOrder()}
              >
                {t("placeOrder")}
              </Button>
            </>
          )}
          {!cart?.items.length && useTreat ? (
            <Button
              className="w-full"
              size="lg"
              disabled={busy || !openState.isOpen}
              onClick={() => void submitOrder()}
            >
              {t("loyaltyUseNow")}
            </Button>
          ) : null}

          {orders?.orders.length ? (
            <div className="pt-4">
              <h2 className="text-xl">{t("sentOrders")}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t("cancelIfPending")}
              </p>
              <div className="mt-3 space-y-3">
                {orders.orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <OrderBadge status={order.status} />
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(order.createdAt).toLocaleTimeString(dateLocale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ul className="mt-2 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}×{" "}
                          {menuNames.names.get(item.menuItemId ?? "") ?? item.name}
                          {item.options?.length
                            ? ` · ${item.options
                                .map((name) => menuNames.optionNames.get(name) ?? name)
                                .join(", ")}`
                            : ""}
                          {item.note ? ` — ${item.note}` : ""}
                          {item.complimentary ? ` · ${t("loyaltyGift")}` : ""}
                        </li>
                      ))}
                    </ul>
                    {order.status === "PENDING" ? (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setCancelOrderId(order.id)}
                      >
                        {t("cancelOrder")}
                      </Button>
                    ) : order.status === "CANCELLED" ? (
                      <p className="mt-2 text-xs text-red-700">{t("cancelled")}</p>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {t("kitchenHasIt")}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {area === "menu" && tab === "bill" ? (
        <div className="space-y-4 px-4 py-6">
          <SectionLogo src={venueLogo} label={t("tabBill")} />
          <p className="text-sm text-[var(--muted)]">
            {t("billIntro")}
          </p>
          {orders?.orders.some((order) => order.status === "PENDING") ? (
            <Card className="border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-medium">{t("pendingOrder")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("pendingHint")}
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => {
                  setArea("menu");
                  setTab("cart");
                }}
              >
                {t("goToOrders")}
              </Button>
            </Card>
          ) : null}
          {bill?.guests.map((guest) => {
            const lines = groupedBill.get(guest.id) ?? [];
            const sub = lines.reduce((s, l) => s + l.price * l.quantity, 0);
            return (
              <Card key={guest.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {guest.nickname}
                    {guest.id === guestId ? t("youParen") : ""}
                  </p>
                  <p className="text-sm">{formatTRY(sub)}</p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                  {lines.length === 0 ? (
                    <li>{t("noOrdersYet")}</li>
                  ) : (
                    lines.map((line) => (
                      <li key={line.id} className="flex justify-between gap-2">
                        <span>
                          {line.quantity}×{" "}
                          {menuNames.names.get(line.menuItemId ?? "") ?? line.name}
                          {line.options?.length
                            ? ` · ${line.options
                                .map((name) => menuNames.optionNames.get(name) ?? name)
                                .join(", ")}`
                            : ""}
                          {line.note ? ` — ${line.note}` : ""}
                          {line.complimentary ? ` · ${t("loyaltyGift")}` : ""}
                        </span>
                        <span>
                          {line.complimentary
                            ? t("loyaltyGift")
                            : formatTRY(line.price * line.quantity)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            );
          })}
          <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
            <p>{t("tableBill")}</p>
            <p className="text-xl font-medium">{formatTRY(bill?.total ?? 0)}</p>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={calling || billCooldownSeconds > 0}
            onClick={() => setBillConfirmOpen(true)}
          >
            {calling
              ? t("requesting")
              : billCooldownSeconds > 0
                ? t("billRequested")
                : t("wantBill")}
          </Button>
          <Card className="space-y-3 p-4">
            <div>
              <p className="font-medium">{t("digitalReceipt")}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("digitalReceiptHint")}
              </p>
            </div>
            <Input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={receiptEmail}
              onChange={(event) => setReceiptEmail(event.target.value)}
            />
            <Button
              className="w-full"
              variant="outline"
              disabled={receiptBusy || !receiptEmail}
              onClick={() => void emailReceipt()}
            >
              {receiptBusy ? t("saving") : t("sendWhenClosed")}
            </Button>
          </Card>
        </div>
      ) : null}

      <Popup
        title={t("cancelTitle")}
        message={cancelOrderId ? t("cancelBody") : null}
        confirmLabel={t("yesCancel")}
        cancelLabel={t("dismiss")}
        busy={busy}
        onConfirm={() => void cancelOwnOrder()}
        onClose={() => setCancelOrderId(null)}
      />
      <Popup
        title={alertPopup?.title ?? t("notification")}
        message={alertPopup?.body ?? null}
        onClose={() => setAlertPopup(null)}
      />
      <Popup
        title={t("waiterTitle")}
        message={waiterConfirmOpen ? t("waiterBody") : null}
        confirmLabel={t("yesWaiter")}
        cancelLabel={t("dismiss")}
        busy={calling}
        onConfirm={() => void callWaiter()}
        onClose={() => setWaiterConfirmOpen(false)}
      />
      <Popup
        title={t("billAskTitle")}
        message={billConfirmOpen ? t("billAskBody") : null}
        confirmLabel={t("yesBill")}
        cancelLabel={t("dismiss")}
        busy={calling}
        onConfirm={() => void requestBill()}
        onClose={() => setBillConfirmOpen(false)}
      />

      <div
        className={
          area === "play" && gameImmersive
            ? "fixed inset-0 z-30 overflow-y-auto bg-[var(--bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            : area === "play"
              ? "flex-1 px-4 py-6"
              : "hidden"
        }
      >
        <GuestGames
          guestToken={guestToken}
          guestHeaders={guestHeaders}
          onRoundLive={() => setArea("play")}
          onImmersiveChange={setGameImmersive}
        />
      </div>

      {area === "history" ? (
        <div className="flex-1 px-4 py-6">
          <GuestHistory qrToken={qrToken} />
        </div>
      ) : null}

      {area === "loyalty" ? (
        <div className="flex-1 px-4 py-6">
          <GuestLoyalty qrToken={qrToken} />
        </div>
      ) : null}

      {area === "menu" && tab === "alerts" ? (
        <div className="space-y-3 px-4 py-6">
          <SectionLogo src={venueLogo} label={t("tabAlerts")} />
          {!notes?.notifications.length ? (
            <p className="text-[var(--muted)]">{t("noAlerts")}</p>
          ) : (
            notes.notifications.map((item) => {
              const copy = localizedNotice(locale, item);
              return (
              <Card
                key={item.id}
                className={`p-4 ${item.read ? "" : "border-[var(--accent)]"}`}
              >
                <p className="font-medium">{copy.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{copy.body}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {new Date(item.createdAt).toLocaleTimeString(dateLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Card>
              );
            })
          )}
        </div>
      ) : null}

    </div>
  );
}
