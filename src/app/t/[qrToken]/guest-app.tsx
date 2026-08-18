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
import type { OrderStatus } from "@prisma/client";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  soldOut: boolean;
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
  }[];
};

type OrdersResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    items: { id: string; name: string; price: number; quantity: number; note: string | null }[];
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
  }[];
  total: number;
};

type Tab = "menu" | "cart" | "bill" | "alerts";

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
            <h1 className="text-3xl">Masa {tableNumber}</h1>
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
        <p className="mt-2 text-sm">{formatTRY(item.price)}</p>
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
  tableNumber: string;
  categories: Category[];
  openState: { isOpen: boolean; label: string };
  staffPreview?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("menu");
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
  const [cartPulse, setCartPulse] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const seenAlert = useRef<string | null>(null);
  const noteTimers = useRef<Record<string, number>>({});

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
        setGuestId(data.guestId);
        setGuestToken(data.guestToken);
        window.localStorage.setItem(guestStorageKey(qrToken), data.guestToken);
        if (data.nickname) {
          setName(data.nickname);
        }
        setNamed(false);
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
    cart: CartResponse;
    orders: OrdersResponse;
    bill: BillResponse;
    notes: NotesResponse;
  };

  const { data: live, setData: setLive } = usePoll<LiveResponse>(
    ready && guestToken ? "/api/guest/live" : null,
    5000,
    guestToken,
  );
  const cart = live?.cart ?? null;
  const orders = live?.orders;
  const bill = live?.bill;
  const notes = live?.notes;

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

  async function addToCart(menuItemId: string) {
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
      body: JSON.stringify({ menuItemId, quantity: 1 }),
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
    setCalling(true);
    const res = await fetch("/api/guest/call-waiter", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    setCalling(false);
    if (!res.ok) {
      setMessage(data.error ?? "Garson çağrılamadı");
      return;
    }
    setMessage(data.message ?? "Garson çağrıldı.");
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
    const res = await fetch("/api/guest/orders", {
      method: "POST",
      credentials: "include",
      headers: guestHeaders(),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.error ?? "Sipariş gönderilemedi");
      return;
    }
    setCart({ items: [] });
    setTab("bill");
    setMessage("Siparişin mutfağa iletildi.");
  }

  async function rejoin() {
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
      body: JSON.stringify({ qr: qrToken, guestToken: saved }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.staffPreview || !data.guestToken) return null;
    setGuestId(data.guestId);
    setGuestToken(data.guestToken);
    window.localStorage.setItem(guestStorageKey(qrToken), data.guestToken);
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
      const send = (token: string) =>
        fetch("/api/guest/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-guest-token": token } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ nickname: trimmed }),
        });

      let res = await send(guestToken);
      if (res.status === 401) {
        const token = await rejoin();
        if (token) res = await send(token);
      }
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
    setMessage(`${latest.title}: ${latest.body}`);
    setAlertPopup({ title: latest.title, body: latest.body });
    pingPhone(latest.title, latest.body);
  }, [notes]);

  const unread = notes?.unread ?? 0;
  const tabs = [
    ["menu", "Menü"],
    ["cart", cartCount ? `Sepet (${cartCount})` : "Sepet"],
    ["bill", "Hesap"],
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
        <div className="flex flex-1 flex-col justify-center px-5">
          <h2 className="text-3xl">Masaya katıl</h2>
          <p className="mt-2 text-[var(--muted)]">
            Adını yazarsan hesapta sen görünürsün. İstemezsen isimsiz de
            devam edebilirsin.
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
            onClick={() => setNamed(true)}
          >
            İsimsiz devam et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
      {flash ? <div className="add-flash" /> : null}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/80 backdrop-blur-md">
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
              disabled={calling}
              onClick={() => void callWaiter()}
            >
              {calling ? "Çağrılıyor…" : "Garson çağır"}
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
        <div className="px-4 pb-3">
        <div className="mt-0 grid grid-cols-4 gap-1 rounded-full bg-black/5 p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => (key === "alerts" ? void openAlerts() : setTab(key))}
              className={`relative min-h-11 touch-manipulation rounded-full px-1 text-xs font-medium sm:text-sm ${
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
        {bill?.guests.length ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {bill.guests.map((g) => (g.isMe ? `${g.nickname} (sen)` : g.nickname)).join(" · ")}
          </p>
        ) : null}
        </div>
      </header>

      <p
        className={`mx-4 mt-3 rounded-xl px-3 py-2 text-sm ${
          openState.isOpen
            ? "bg-emerald-50 text-emerald-800"
            : "bg-red-50 text-red-800"
        }`}
      >
        {openState.label}
      </p>

      {message ? (
        <p className="px-4 pt-3 text-sm text-[var(--accent)]">{message}</p>
      ) : null}

      {tab === "menu" ? (
        <div className="space-y-8 px-4 py-6">
          {categories.map((category) => (
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
                        onClick={() => void addToCart(item.id)}
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
                          {item.note ? ` — ${item.note}` : ""}
                        </li>
                      ))}
                    </ul>
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
        title={alertPopup?.title ?? "Bildirim"}
        message={alertPopup?.body ?? null}
        onClose={() => setAlertPopup(null)}
      />

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
