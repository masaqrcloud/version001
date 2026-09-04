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
import { GuestPasaparola } from "@/components/guest-pasaparola";
import { CalorieBesidePrice, NutritionLabels } from "@/components/nutrition-labels";
import {
  itemHiddenByFilter,
  type AllergenId,
} from "@/lib/nutrition";
import { isAndroidDevice, openAndroidWifiConnect } from "@/lib/wifi";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
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
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

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
    options: { id: string; name: string; priceDelta: number }[];
  }[];
};

type OrdersResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    items: { id: string; name: string; price: number; quantity: number; note: string | null; options?: string[] }[];
  }[];
};

type BillResponse = {
  currentGuestId: string;
  guests: { id: string; nickname: string; isMe: boolean }[];
  lines: {
    id: string;
    guestId: string;
    guestName: string;
    name: string;
    price: number;
    quantity: number;
    note: string | null;
    status: OrderStatus;
    options?: string[];
  }[];
  total: number;
};

type Tab = "menu" | "cart" | "bill" | "games" | "alerts";

type NotesResponse = {
  unread: number;
  notifications: {
    id: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
  }[];
};

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
      <Card className="border-sky-200 bg-sky-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
          Misafir Wi‑Fi
        </p>
        <p className="mt-1 truncate font-medium">{wifiName}</p>
        {wifiPassword ? (
          <p className="mt-1 break-all text-sm text-[var(--muted)]">
            Şifre:{" "}
            <span className="font-medium text-[var(--ink)]">{wifiPassword}</span>
            {copied ? (
              <span className="ml-2 whitespace-nowrap text-xs font-semibold text-sky-700">
                Kopyalandı
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted)]">
            {copied ? "Kopyalandı" : "Şifresiz ağ"}
          </p>
        )}
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
            <h1 className="text-3xl">{tableLabel(tableNumber)}</h1>
          </div>
        </div>
        {children}
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
          <p className="mt-1 text-xs font-semibold text-red-700">Tükendi</p>
        ) : null}
      </div>
      {action}
    </Card>
  );
}

export function GuestApp({
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
}: {
  qrToken: string;
  venueName: string;
  venueTagline?: string | null;
  venueLogo?: string | null;
  venueCover?: string | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  tableNumber: string;
  categories: Category[];
  openState: { isOpen: boolean; label: string };
  staffPreview?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("menu");
  const [gameImmersive, setGameImmersive] = useState(false);
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
  const seenAlert = useRef<string | null>(null);
  const noteTimers = useRef<Record<string, number>>({});
  const pendingOrderKey = useRef<string | null>(null);
  const [hideAllergens, setHideAllergens] = useState<AllergenId[]>([]);
  const [hideAlcohol, setHideAlcohol] = useState(false);
  const [hidePork, setHidePork] = useState(false);
  const visibleCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) =>
              !itemHiddenByFilter(item, hideAllergens, hideAlcohol, hidePork),
          ),
        }))
        .filter((category) => category.items.length > 0),
    [categories, hideAllergens, hideAlcohol, hidePork],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
          setNameError(data.error ?? "Masaya bağlanılamadı");
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
        if (data.idle || !data.guestToken) {
          window.localStorage.removeItem(guestStorageKey(qrToken));
          setGuestId("");
          setGuestToken("");
          setJoinClosed(false);
          setNamed(false);
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
          setNameError("Bağlantı yok. Telefonun aynı WiFi’de olduğundan emin ol.");
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
    setMessage("Sepete eklendi");
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
      setMessage(json.error ?? "Eklenemedi");
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
        ? "E-posta adresin kaydedildi. Hesap kapanınca dijital adisyon gönderilecek."
        : data.error ?? "E-posta tercihi kaydedilemedi.",
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
      setMessage(data.error ?? "Garson çağrılamadı");
      return;
    }
    setMessage(data.message ?? "Garson çağrıldı.");
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
      setMessage(data.error ?? "Hesap istenemedi");
      return;
    }
    setMessage(data.message ?? "Hesap isteğin iletildi.");
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
        body: JSON.stringify({ idempotencyKey }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        pendingOrderKey.current = null;
        setMessage(json.error ?? "Sipariş gönderilemedi");
        return;
      }
      pendingOrderKey.current = null;
      setCart({ items: [] });
      setTab("cart");
      setMessage("Siparişin mutfağa iletildi. Hazırlanmadan iptal edebilirsin.");
    } catch {
      setMessage(
        "Bağlantı kesildi. Tekrar deneyebilirsin; sipariş iki kez oluşmaz.",
      );
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
      setMessage(json.error ?? "Sipariş iptal edilemedi.");
      return;
    }
    setMessage("Siparişin iptal edildi. Stok geri alındı.");
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
      setNameError("En az 2 karakter yaz");
      return;
    }
    setBusy(true);
    setNameError(null);
    try {
      const token = guestToken || (await sitDown(trimmed));
      if (!token) {
        setNameError("Hesap kapatıldı. Evden tekrar sipariş verilemez.");
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
        setNameError(data.error ?? "İsim kaydedilemedi, tekrar dene");
        return;
      }
      setName(trimmed);
      setNamed(true);
      void askAlertPermission();
    } catch {
      setNameError("Kayıt gidemedi. Aynı WiFi’de olup sayfayı yenile.");
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
    pingPhone(latest.title, latest.body);
    if (latest.title === "Pasaparola") {
      setTab("games");
      return;
    }
    setMessage(`${latest.title}: ${latest.body}`);
    setAlertPopup({ title: latest.title, body: latest.body });
  }, [notes]);

  const unread = notes?.unread ?? 0;
  const tabs = [
    ["menu", "Menü"],
    ["cart", cartCount ? `Sepet (${cartCount})` : "Sepet"],
    ["bill", "Hesap"],
    ["games", "Oyunlar"],
    ["alerts", unread ? `Bildirim (${unread})` : "Bildirim"],
  ] as const;

  async function openAlerts() {
    setTab("alerts");
    if (!unread) return;
    await fetch("/api/guest/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: guestHeaders(),
    });
  }

  const shownName = name.trim() || "Misafir";

  if (staffPreview) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
        >
          <p className="mt-2 rounded-xl bg-black/5 px-3 py-2 text-sm">
            Personel önizleme. Masada aktif görünmezsin, sipariş veremezsin.
          </p>
        </GuestBrand>
        <GuestWifiCard
          className="mx-4"
          wifiName={wifiName}
          wifiPassword={wifiPassword}
        />
        <div className="space-y-8 px-4 py-6">
          {categories.map((category) => (
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
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col justify-center px-5">
        <p className="text-[var(--muted)]">
          {nameError ?? "Masaya bağlanılıyor…"}
        </p>
      </div>
    );
  }

  if (joinClosed || sessionStatus?.closed) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col px-4 py-8">
        <div className="text-center">
          <p className="page-kicker">{sessionStatus?.venueName ?? venueName}</p>
          <h1 className="mt-2 font-serif text-4xl">Teşekkür ederiz</h1>
          <p className="mt-2 text-[var(--muted)]">
            {tableLabel(sessionStatus?.tableNumber ?? tableNumber)} hesabı
            kapatıldı.
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Yeni sipariş için masadaki QR’yi tekrar okut. Sayfayı yenilemek
            hesabı açmaz.
          </p>
        </div>
        {nameError ? (
          <p className="mt-2 text-center text-sm text-red-700">{nameError}</p>
        ) : null}
        {(sessionStatus?.lines?.length ?? 0) > 0 ? (
        <Card className="mt-6 p-5">
          <h2 className="font-serif text-2xl">Adisyon özeti</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(sessionStatus?.lines ?? []).map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>
                  {line.quantity}× {line.name}
                  {line.options.length ? ` · ${line.options.join(", ")}` : ""}
                </span>
                <span>{formatTRY(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--line)] pt-3 text-right font-medium">
            Toplam: {formatTRY(sessionStatus?.total ?? 0)}
          </p>
          {sessionStatus?.receiptSent ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Dijital adisyon e-posta adresine gönderildi.
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
            Değerlendirmen için teşekkürler.
          </p>
        ) : null}
      </div>
    );
  }

  if (!named) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
        />
        <GuestWifiCard
          className="mx-4 mt-1"
          wifiName={wifiName}
          wifiPassword={wifiPassword}
        />
        <div className="flex flex-1 flex-col justify-center px-5">
          <h2 className="text-3xl">Masaya katıl</h2>
          <p className="mt-2 text-[var(--muted)]">
            Adını yazıp katılınca masa dolu olur. Sadece QR’yi açmak veya
            sayfayı yenilemek hesabı açmaz.
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
              placeholder="Adın (ör. Emirhan)"
              maxLength={40}
              enterKeyHint="done"
            />
            {nameError ? <p className="text-sm text-red-700">{nameError}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Kaydediliyor…" : "Adımla katıl"}
            </Button>
          </form>
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
                  setNameError(
                    "Hesap kapatıldı. Evden tekrar sipariş verilemez.",
                  );
                  return;
                }
                setNamed(true);
              })();
            }}
          >
            İsimsiz devam et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
      {configuringItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <Card className="max-h-[85dvh] w-full max-w-lg overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="page-kicker">Ürünü hazırla</p>
                <h2 className="font-serif text-2xl">{configuringItem.name}</h2>
                <NutritionLabels item={configuringItem} />
                {configuringItem.calories != null ? (
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {configuringItem.calories} kcal / porsiyon
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfiguringItem(null)}
              >
                Kapat
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
                        {minimum > 0 ? "Zorunlu" : "İsteğe bağlı"} · en fazla{" "}
                        {group.maxSelections}
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
              Sepete ekle ·{" "}
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
      <header className={`sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md ${tab === "games" && gameImmersive ? "hidden" : ""}`}>
        {tab !== "games" ? (
        <GuestBrand
          venueName={venueName}
          venueTagline={venueTagline}
          venueLogo={venueLogo}
          venueCover={venueCover}
          tableNumber={tableNumber}
          compact
        >
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">
              {bill?.guests.length ?? 1} kişi masada
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--muted)]">Merhaba, {shownName}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={calling || waiterCooldownSeconds > 0}
              onClick={() => setWaiterConfirmOpen(true)}
            >
              {calling
                ? "Çağrılıyor…"
                : waiterCooldownSeconds > 0
                  ? `Tekrar çağır ${waiterCooldownLabel}`
                  : "Garson çağır"}
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
                placeholder="Adın (isteğe bağlı)"
                maxLength={40}
              />
              <Button type="submit" size="sm" disabled={busy || name.trim().length < 2}>
                Kaydet
              </Button>
            </form>
          ) : null}
          {nameError ? <p className="mt-2 text-sm text-red-700">{nameError}</p> : null}
        </GuestBrand>
        ) : (
          <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="pb-2 font-serif text-xl">Oyunlar</p>
          </div>
        )}
        <div className="px-4 pb-3">
        <div className="mt-0 grid grid-cols-5 gap-1 rounded-full bg-black/5 p-1">
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
              {key === "games" ? (
                <svg
                  viewBox="0 0 24 24"
                  className="mb-0.5 h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="8" width="18" height="11" rx="4" />
                  <path d="M8 13v3M6.5 14.5h3" />
                  <circle cx="15.5" cy="13" r="0.7" fill="currentColor" />
                  <circle cx="17.5" cy="15.2" r="0.7" fill="currentColor" />
                </svg>
              ) : null}
              {label}
              {key === "cart" && cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {tab !== "games" && bill?.guests.length ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {bill.guests.map((g) => (g.isMe ? `${g.nickname} (sen)` : g.nickname)).join(" · ")}
          </p>
        ) : null}
        </div>
      </header>

      {tab !== "games" ? (
        <>
      <p
        className={`mx-4 mt-3 rounded-xl px-3 py-2 text-sm ${
          openState.isOpen
            ? "bg-emerald-50 text-emerald-800"
            : "bg-red-50 text-red-800"
        }`}
      >
        {openState.label}
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

      {tab === "menu" ? (
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
            Alerjen, alkol, domuz türevi ve kalori bilgisi Tarım ve Orman
            Bakanlığı toplu tüketim yerleri düzenlemesine göre gösterilir.
            Cihazı olmayan misafirler garsona sorabilir.
          </p>
          {!visibleCategories.length ? (
            <p className="text-sm text-[var(--muted)]">
              Seçtiğin filtrelere uyan ürün yok. Filtreyi gevşet.
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
                        {item.soldOut ? "Tükendi" : "Ekle"}
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "cart" ? (
        <div className="space-y-4 px-4 py-6">
          <SectionLogo src={venueLogo} label="Sepet" />
          {!cart?.items.length ? (
            <p className="text-[var(--muted)]">Sepetin boş. Menüden ürün ekle.</p>
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
                          {item.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {formatTRY(item.price)}
                        </p>
                        {item.options.length ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {item.options.map((option) => option.name).join(" · ")}
                          </p>
                        ) : null}
                        {!item.available ? (
                          <p className="mt-1 text-xs font-semibold text-red-700">
                            Bu ürün artık mevcut değil
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
                    placeholder="Not: sütsüz, az şeker, alerji…"
                    onChange={(e) => setNoteDraft(item.id, e.target.value)}
                  />
                </Card>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[var(--muted)]">Senin sepetin</p>
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
                Sipariş ver
              </Button>
            </>
          )}

          {orders?.orders.length ? (
            <div className="pt-4">
              <h2 className="text-xl">Gönderdiğin siparişler</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Mutfak henüz hazırlamaya başlamadıysa iptal edebilirsin.
              </p>
              <div className="mt-3 space-y-3">
                {orders.orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <OrderBadge status={order.status} />
                      <p className="text-xs text-[var(--muted)]">
                        {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ul className="mt-2 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity}× {item.name}
                          {item.options?.length
                            ? ` · ${item.options.join(", ")}`
                            : ""}
                          {item.note ? ` — ${item.note}` : ""}
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
                        Siparişi iptal et
                      </Button>
                    ) : order.status === "CANCELLED" ? (
                      <p className="mt-2 text-xs text-red-700">İptal edildi</p>
                    ) : (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Mutfak aldı. İptal için garsonu çağır.
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "bill" ? (
        <div className="space-y-4 px-4 py-6">
          <SectionLogo src={venueLogo} label="Hesap" />
          <p className="text-sm text-[var(--muted)]">
            Masadaki herkesin gönderdiği siparişler. Sepette bekleyenler burada yok.
          </p>
          {orders?.orders.some((order) => order.status === "PENDING") ? (
            <Card className="border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-medium">Bekleyen siparişin var.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Mutfak başlamadıysa Sepet sekmesinden iptal edebilirsin.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => setTab("cart")}
              >
                Siparişlerime git
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
                    {guest.id === guestId ? " (sen)" : ""}
                  </p>
                  <p className="text-sm">{formatTRY(sub)}</p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                  {lines.length === 0 ? (
                    <li>Henüz sipariş yok</li>
                  ) : (
                    lines.map((line) => (
                      <li key={line.id} className="flex justify-between gap-2">
                        <span>
                          {line.quantity}× {line.name}
                          {line.options?.length
                            ? ` · ${line.options.join(", ")}`
                            : ""}
                          {line.note ? ` — ${line.note}` : ""}
                        </span>
                        <span>{formatTRY(line.price * line.quantity)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            );
          })}
          <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
            <p>Masa hesabı</p>
            <p className="text-xl font-medium">{formatTRY(bill?.total ?? 0)}</p>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={calling || billCooldownSeconds > 0}
            onClick={() => setBillConfirmOpen(true)}
          >
            {calling
              ? "İletiliyor…"
              : billCooldownSeconds > 0
                ? "Hesap istendi"
                : "Hesabı istiyorum"}
          </Button>
          <Card className="space-y-3 p-4">
            <div>
              <p className="font-medium">Dijital adisyon</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Hesap kapandığında kesinleşen masa adisyonunu e-posta ile al.
                Mali fiş veya fatura yerine geçmez.
              </p>
            </div>
            <Input
              type="email"
              placeholder="E-posta adresin"
              value={receiptEmail}
              onChange={(event) => setReceiptEmail(event.target.value)}
            />
            <Button
              className="w-full"
              variant="outline"
              disabled={receiptBusy || !receiptEmail}
              onClick={() => void emailReceipt()}
            >
              {receiptBusy ? "Kaydediliyor…" : "Hesap kapanınca gönder"}
            </Button>
          </Card>
        </div>
      ) : null}

      <Popup
        title="Siparişi iptal etmek istiyor musun?"
        message={
          cancelOrderId
            ? "Mutfak henüz başlamadıysa sipariş düşer ve stok geri gelir. Onaylarsan mutfak da haberdar olur."
            : null
        }
        confirmLabel="Evet, iptal et"
        cancelLabel="Vazgeç"
        busy={busy}
        onConfirm={() => void cancelOwnOrder()}
        onClose={() => setCancelOrderId(null)}
      />
      <Popup
        title={alertPopup?.title ?? "Bildirim"}
        message={alertPopup?.body ?? null}
        onClose={() => setAlertPopup(null)}
      />
      <Popup
        title="Garsonu çağırmak istiyor musun?"
        message={
          waiterConfirmOpen
            ? "Bu çağrı doğrudan garson ekibine iletilecek. Yanlışlıkla bastıysan Vazgeç'i seçebilirsin. Onaylarsan 10 dakika boyunca tekrar çağrı gönderemezsin."
            : null
        }
        confirmLabel="Evet, garsonu çağır"
        cancelLabel="Vazgeç"
        busy={calling}
        onConfirm={() => void callWaiter()}
        onClose={() => setWaiterConfirmOpen(false)}
      />
      <Popup
        title="Hesabı istiyor musun?"
        message={
          billConfirmOpen
            ? "Garson hesabınla masaya gelir. Bu, garson çağırmaktan ayrı bir istektir."
            : null
        }
        confirmLabel="Evet, hesabı istiyorum"
        cancelLabel="Vazgeç"
        busy={calling}
        onConfirm={() => void requestBill()}
        onClose={() => setBillConfirmOpen(false)}
      />

      <div
        className={
          tab === "games" && gameImmersive
            ? "fixed inset-0 z-30 overflow-y-auto bg-[var(--bg)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            : tab === "games"
              ? "flex-1 px-4 py-6"
              : "hidden"
        }
      >
        <GuestPasaparola
          guestToken={guestToken}
          guestHeaders={guestHeaders}
          onRoundLive={() => setTab("games")}
          onImmersiveChange={setGameImmersive}
        />
      </div>

      {tab === "alerts" ? (
        <div className="space-y-3 px-4 py-6">
          <SectionLogo src={venueLogo} label="Bildirim" />
          {!notes?.notifications.length ? (
            <p className="text-[var(--muted)]">Henüz bildirimin yok.</p>
          ) : (
            notes.notifications.map((item) => (
              <Card
                key={item.id}
                className={`p-4 ${item.read ? "" : "border-[var(--accent)]"}`}
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{item.body}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {new Date(item.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Card>
            ))
          )}
        </div>
      ) : null}

    </div>
  );
}
