"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatTRY } from "@/lib/utils";

type DemoItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  allergens: string[];
  category: string;
  prepMinutes: number;
};

type DemoLine = DemoItem & { qty: number; gift?: boolean };

type DemoOrderStatus = "PENDING" | "PREPARING" | "READY";

type DemoOrder = {
  id: number;
  lines: DemoLine[];
  status: DemoOrderStatus;
  minutes: number;
  queueAhead: number;
  time: string;
};

const DEMO_ITEMS: DemoItem[] = [
  {
    id: "kalamar",
    name: "Izgara kalamar",
    description: "Limon ve ev yeşilliği",
    price: 420,
    calories: 186,
    allergens: ["Gluten"],
    category: "Mutfak",
    prepMinutes: 14,
  },
  {
    id: "tost",
    name: "Sahil tost",
    description: "Cheddar, domates, pesto",
    price: 280,
    calories: 340,
    allergens: ["Gluten", "Süt"],
    category: "Mutfak",
    prepMinutes: 9,
  },
  {
    id: "cheesecake",
    name: "Portakallı cheesecake",
    description: "Günün dilimi",
    price: 210,
    calories: 290,
    allergens: ["Süt", "Gluten"],
    category: "Tatlı",
    prepMinutes: 4,
  },
  {
    id: "kahve",
    name: "Filtre kahve",
    description: "200 ml",
    price: 95,
    calories: 8,
    allergens: [],
    category: "İçecek",
    prepMinutes: 3,
  },
];

const GIFT_ITEM = DEMO_ITEMS[3];
const ALLERGENS = ["Gluten", "Süt"];
const TABLE_MATES = [
  { name: "Ayşe", item: "Sahil tost", price: 280 },
  { name: "Mert", item: "Filtre kahve", price: 95 },
];

type Area = "join" | "hub" | "menu" | "play" | "history" | "loyalty";
type Tab = "menu" | "cart" | "bill";
type BillView = "orders" | "bill";

const STATUS_LABEL: Record<DemoOrderStatus, string> = {
  PENDING: "Mutfakta bekliyor",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
};

const STATUS_CLASS: Record<DemoOrderStatus, string> = {
  PENDING: "bg-warn-soft text-warn",
  PREPARING: "bg-[var(--accent-soft)] text-[var(--accent)]",
  READY: "bg-ok-soft text-ok",
};

function PersonIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function GuestChip({ name, me }: { name: string; me?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[10px] font-medium ${
        me ? "bg-[var(--accent)] text-white" : "bg-soft text-[var(--ink)]"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold ${
          me
            ? "bg-white/25 text-white"
            : "bg-[var(--accent-soft)] text-[var(--accent)]"
        }`}
      >
        {name.charAt(0).toLocaleUpperCase("tr")}
      </span>
      {name}
      {me ? " (sen)" : ""}
    </span>
  );
}

function DemoBubble({
  title,
  hint,
  image,
  onClick,
}: {
  title: string;
  hint: string;
  image: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="hub-bubble"
      style={{ minHeight: 0, borderRadius: "1.4rem" }}
      onClick={onClick}
    >
      <span className="hub-bubble-photo">
        <img src={image} alt="" />
      </span>
      <span className="hub-bubble-fade" />
      <span className="hub-bubble-copy" style={{ padding: "0 0.4rem 0.55rem" }}>
        <span className="font-serif text-lg leading-none text-[var(--ink)]">
          {title}
        </span>
        <span className="mt-0.5 text-center text-[9px] leading-snug text-[var(--muted)]">
          {hint}
        </span>
      </span>
    </button>
  );
}

function clockNow() {
  return new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeGuestDemo() {
  const [started, setStarted] = useState(false);
  const [area, setArea] = useState<Area>("join");
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("menu");
  const [billView, setBillView] = useState<BillView>("orders");
  const [cart, setCart] = useState<DemoLine[]>([]);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [useGift, setUseGift] = useState(false);
  const [giftUsed, setGiftUsed] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [popup, setPopup] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const guestLabel = name.trim() || "Misafir";
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const myLines = orders.flatMap((order) => order.lines);
  const myTotal = myLines.reduce(
    (sum, line) => sum + (line.gift ? 0 : line.price * line.qty),
    0,
  );
  const tableTotal =
    myTotal + TABLE_MATES.reduce((sum, mate) => sum + mate.price, 0);

  const grouped = useMemo(() => {
    const map = new Map<string, DemoItem[]>();
    for (const item of DEMO_ITEMS) {
      if (item.allergens.some((allergen) => hidden.includes(allergen))) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [hidden]);

  function later(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function flash(text: string) {
    setNotice(text);
    later(2200, () => setNotice(null));
  }

  function openMenu(next: Tab = "menu") {
    setTab(next);
    setArea("menu");
  }

  function addItem(item: DemoItem) {
    setCart((current) => {
      const found = current.find((line) => line.id === item.id);
      if (found) {
        return current.map((line) =>
          line.id === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...current, { ...item, qty: 1 }];
    });
    setPulse(true);
    later(550, () => setPulse(false));
  }

  function changeQty(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.id === id ? { ...line, qty: line.qty + delta } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function setStatus(id: number, status: DemoOrderStatus) {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    );
  }

  function sendOrder() {
    const lines = [...cart];
    if (useGift && !giftUsed) {
      lines.push({ ...GIFT_ITEM, qty: 1, gift: true });
      setGiftUsed(true);
      setUseGift(false);
    }
    if (!lines.length) return;
    const id = Date.now();
    const minutes = Math.max(...lines.map((line) => line.prepMinutes)) + 2;
    setOrders((current) => [
      { id, lines, status: "PENDING", minutes, queueAhead: 2, time: clockNow() },
      ...current,
    ]);
    setCart([]);
    setTab("bill");
    setBillView("orders");
    flash("Siparişin mutfağa iletildi.");
    later(4000, () => setStatus(id, "PREPARING"));
    later(11000, () => {
      setStatus(id, "READY");
      setPopup("Mutfak hazır dedi. Garson masaya getirecek.");
    });
  }

  const header = (
    <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-semibold text-[var(--ink)]">
      <span>21:14</span>
      <span>MasaQR</span>
      <span>5G</span>
    </div>
  );

  function backBar(title: string) {
    return (
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-medium"
          onClick={() => setArea("hub")}
        >
          ‹ Ana menü
        </button>
        <p className="min-w-0 flex-1 text-center font-serif text-lg leading-none">
          {title}
        </p>
        <span className="w-14" />
      </div>
    );
  }

  return (
    <div className="demo-phone">
      <div className="demo-phone-bezel">
        <div className="demo-phone-island" />
        <div className="demo-phone-screen relative">
          {!started ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--bg)]/70 px-6 text-center backdrop-blur-sm">
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                Demo
              </span>
              <p className="font-serif text-2xl leading-tight">
                Demoyu denemek için başlat
              </p>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                Örnek bir masada misafir gibi sipariş ver. Hiçbir şey gerçek
                mutfağa gitmez.
              </p>
              <Button size="lg" className="w-full" onClick={() => setStarted(true)}>
                Başlat
              </Button>
            </div>
          ) : null}

          {popup ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 px-5">
              <Card className="w-full p-4">
                <p className="font-serif text-xl">Sipariş hazır</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{popup}</p>
                <Button className="mt-3 w-full" size="sm" onClick={() => setPopup(null)}>
                  Tamam
                </Button>
              </Card>
            </div>
          ) : null}

          <div
            aria-hidden={!started}
            className={`flex min-h-0 flex-1 flex-col ${started ? "" : "pointer-events-none select-none"}`}
          >
            {header}

            {area === "join" || area === "hub" ? (
              <div className="relative">
                <div
                  className="h-24 w-full"
                  style={{
                    background:
                      "linear-gradient(145deg, #ff5a3c 0%, #e23b2c 42%, #e89b1a 100%)",
                  }}
                />
                <div className="hub-cover-fade pointer-events-none absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 px-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Sahil Kafe
                  </p>
                  <p className="font-serif text-2xl leading-tight">Masa 12</p>
                </div>
              </div>
            ) : null}

            {area === "join" ? (
              <div className="flex flex-1 flex-col justify-center px-4 pb-4">
                <p className="font-serif text-2xl">Masaya katıl</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                  Adını yazarak veya isimsiz devam ederek örnek masaya otur.
                  Sipariş gerçek mutfağa gitmez.
                </p>
                <form
                  className="mt-4 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setArea("hub");
                  }}
                >
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Adın (ör. Emirhan)"
                    maxLength={24}
                  />
                  <Button type="submit" className="w-full" size="sm">
                    Adımla katıl
                  </Button>
                </form>
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--muted)] underline-offset-4 hover:underline"
                  onClick={() => setArea("hub")}
                >
                  İsimsiz devam et
                </button>
              </div>
            ) : null}

            {area === "hub" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
                <p className="text-[11px] text-[var(--muted)]">Hoş geldin</p>
                <p className="font-serif text-xl leading-tight">
                  Merhaba, {guestLabel}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="inline-flex items-center gap-0.5 pr-0.5 text-[10px] font-medium text-[var(--muted)]">
                    <PersonIcon />
                    {TABLE_MATES.length + 1} kişi
                  </span>
                  <GuestChip name={guestLabel} me />
                  {TABLE_MATES.map((mate) => (
                    <GuestChip key={mate.name} name={mate.name} />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Ne yapmak istersin?
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <DemoBubble
                    title="Menü"
                    hint="Sipariş ver, menüyü incele"
                    image="/guest/hub-menu.png"
                    onClick={() => openMenu()}
                  />
                  <DemoBubble
                    title="Oyun"
                    hint="Masayla oyun oyna"
                    image="/guest/hub-play.png"
                    onClick={() => setArea("play")}
                  />
                  <DemoBubble
                    title="Geçmiş"
                    hint="Önceki siparişlerini gör"
                    image="/guest/hub-history.png"
                    onClick={() => setArea("history")}
                  />
                  <DemoBubble
                    title="Müdavim"
                    hint="10’da bir ikram"
                    image="/guest/hub-loyalty.svg"
                    onClick={() => setArea("loyalty")}
                  />
                </div>
                <p className="mt-3 rounded-xl bg-soft px-3 py-2 text-[10px] text-[var(--muted)]">
                  Şu an açık · 23:00’e kadar
                </p>
                <button
                  type="button"
                  className="wifi-card mt-2 w-full rounded-xl px-3 py-2 text-left text-[11px]"
                  onClick={() => {
                    setWifiCopied(true);
                    later(1600, () => setWifiCopied(false));
                  }}
                >
                  <p className="page-kicker">Misafir Wi‑Fi</p>
                  <p className="text-[var(--ink)]">
                    Sahil_Guest · {wifiCopied ? "Kopyalandı" : "sifre123"}
                  </p>
                </button>
              </div>
            ) : null}

            {area === "menu" ? (
              <>
                <div className="px-3 pb-2 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[10px] font-medium"
                      onClick={() => setArea("hub")}
                    >
                      ‹ Ana menü
                    </button>
                    <p className="text-[10px] text-[var(--muted)]">
                      Sahil Kafe · Masa 12
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-full bg-soft p-1">
                    {(
                      [
                        ["menu", "Menü"],
                        ["cart", cartCount ? `Sepet (${cartCount})` : "Sepet"],
                        ["bill", "Hesap"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`min-h-8 rounded-full text-[11px] font-medium ${
                          tab === key
                            ? "bg-[var(--ink)] text-[var(--bg)]"
                            : "text-[var(--ink)]"
                        } ${key === "cart" && pulse ? "cart-pulse" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {notice ? (
                  <p className="mx-3 mb-2 rounded-xl bg-ok-soft px-3 py-2 text-[11px] text-ok">
                    {notice}
                  </p>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  {tab === "menu" ? (
                    <>
                      <Card className="mb-2 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Alerjen filtresi
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ALLERGENS.map((allergen) => {
                            const on = hidden.includes(allergen);
                            return (
                              <button
                                key={allergen}
                                type="button"
                                onClick={() =>
                                  setHidden((current) =>
                                    on
                                      ? current.filter((value) => value !== allergen)
                                      : [...current, allergen],
                                  )
                                }
                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                  on
                                    ? "bg-[var(--ink)] text-[var(--bg)]"
                                    : "bg-soft text-[var(--ink)]"
                                }`}
                              >
                                {on ? `${allergen} gizli` : `${allergen} içermesin`}
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                      <Card className="mb-3 space-y-1 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Müdavim haklarım
                        </p>
                        {giftUsed ? (
                          <p className="text-[11px] text-[var(--muted)]">
                            Henüz kullanılacak ikramın yok.
                          </p>
                        ) : (
                          <>
                            <p className="font-serif text-lg leading-tight">
                              1 ikramın var
                            </p>
                            <p className="text-[10px] text-[var(--muted)]">
                              {GIFT_ITEM.name} · İkram
                            </p>
                            <label className="flex items-center gap-2 pt-0.5 text-[11px]">
                              <input
                                type="checkbox"
                                checked={useGift}
                                onChange={(event) => setUseGift(event.target.checked)}
                              />
                              {useGift
                                ? "İkram bu siparişe eklenecek"
                                : "Bu siparişte ikramı kullan"}
                            </label>
                          </>
                        )}
                      </Card>
                      {!grouped.length ? (
                        <p className="pt-4 text-center text-[11px] text-[var(--muted)]">
                          Filtreye uyan ürün yok.
                        </p>
                      ) : null}
                      {grouped.map(([category, items]) => (
                        <section key={category} className="mb-4">
                          <h3 className="mb-2 font-serif text-lg">{category}</h3>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <Card key={item.id} className="flex items-start gap-2 p-2">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-medium">
                                  {item.name.slice(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-medium leading-tight">
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--muted)]">
                                    {item.description}
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-semibold">
                                    {formatTRY(item.price)}
                                    <span className="ml-1 font-normal text-[var(--muted)]">
                                      {item.calories} kcal
                                    </span>
                                  </p>
                                  {item.allergens.length ? (
                                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                                      {item.allergens.join(" · ")}
                                    </p>
                                  ) : null}
                                </div>
                                <Button
                                  size="sm"
                                  className="h-8 min-w-8 px-2"
                                  onClick={() => addItem(item)}
                                >
                                  +
                                </Button>
                              </Card>
                            ))}
                          </div>
                        </section>
                      ))}
                    </>
                  ) : null}

                  {tab === "cart" ? (
                    cart.length === 0 ? (
                      <div className="pt-8 text-center">
                        <p className="text-xs text-[var(--muted)]">
                          Sepet boş. Menüden ürün ekle.
                        </p>
                        {useGift && !giftUsed ? (
                          <Button className="mt-3 w-full" size="sm" onClick={sendOrder}>
                            İkramı şimdi kullan
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((line) => (
                          <Card
                            key={line.id}
                            className="flex items-center justify-between gap-2 p-3"
                          >
                            <div>
                              <p className="text-[13px] font-medium">{line.name}</p>
                              <p className="text-[11px] text-[var(--muted)]">
                                {formatTRY(line.price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-soft text-sm"
                                onClick={() => changeQty(line.id, -1)}
                              >
                                −
                              </button>
                              <span className="w-4 text-center text-sm">{line.qty}</span>
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-soft text-sm"
                                onClick={() => changeQty(line.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          </Card>
                        ))}
                        {useGift && !giftUsed ? (
                          <p className="text-[11px] text-[var(--accent)]">
                            + {GIFT_ITEM.name} · İkram
                          </p>
                        ) : null}
                        <p className="pt-1 text-right text-sm font-semibold">
                          {formatTRY(cartTotal)}
                        </p>
                        <Button className="w-full" size="sm" onClick={sendOrder}>
                          Siparişi gönder
                        </Button>
                      </div>
                    )
                  ) : null}

                  {tab === "bill" ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1 rounded-full bg-soft p-1">
                        {(
                          [
                            ["orders", "Siparişlerim"],
                            ["bill", "Hesap"],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setBillView(key)}
                            className={`min-h-7 rounded-full text-[11px] font-medium ${
                              billView === key
                                ? "bg-[var(--ink)] text-[var(--bg)]"
                                : "text-[var(--ink)]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {billView === "orders" ? (
                        orders.length === 0 ? (
                          <p className="pt-6 text-center text-xs text-[var(--muted)]">
                            Henüz sipariş göndermedin.
                          </p>
                        ) : (
                          orders.map((order) => (
                            <Card key={order.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[order.status]}`}
                                >
                                  {STATUS_LABEL[order.status]}
                                </span>
                                <span className="text-[10px] text-[var(--muted)]">
                                  {order.time}
                                </span>
                              </div>
                              {order.status !== "READY" ? (
                                <div className="mt-2 rounded-xl bg-soft px-2.5 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-medium">
                                      {order.status === "PREPARING"
                                        ? `Hazırlanıyor · ${order.minutes - 3} dk kaldı`
                                        : `Yaklaşık ${order.minutes} dk içinde hazır`}
                                    </p>
                                    <span className="font-serif text-base text-[var(--accent)]">
                                      ~
                                      {order.status === "PREPARING"
                                        ? order.minutes - 3
                                        : order.minutes}{" "}
                                      dk
                                    </span>
                                  </div>
                                  {order.status === "PENDING" ? (
                                    <p className="text-[10px] text-[var(--muted)]">
                                      Mutfakta önünde {order.queueAhead} sipariş var
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <ul className="mt-2 text-[11px]">
                                {order.lines.map((line) => (
                                  <li key={`${order.id}-${line.id}-${line.gift ? "g" : ""}`}>
                                    {line.qty}× {line.name}
                                    {line.gift ? " · İkram" : ""}
                                  </li>
                                ))}
                              </ul>
                            </Card>
                          ))
                        )
                      ) : (
                        <>
                          <Card className="p-3">
                            <div className="flex justify-between text-[12px] font-medium">
                              <span>{guestLabel} (sen)</span>
                              <span>{formatTRY(myTotal)}</span>
                            </div>
                            <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--muted)]">
                              {myLines.length === 0 ? (
                                <li>Henüz sipariş yok</li>
                              ) : (
                                myLines.map((line, index) => (
                                  <li key={`${line.id}-${index}`} className="flex justify-between">
                                    <span>
                                      {line.qty}× {line.name}
                                    </span>
                                    <span>
                                      {line.gift ? "İkram" : formatTRY(line.price * line.qty)}
                                    </span>
                                  </li>
                                ))
                              )}
                            </ul>
                          </Card>
                          {TABLE_MATES.map((mate) => (
                            <Card key={mate.name} className="p-3">
                              <div className="flex justify-between text-[12px] font-medium">
                                <span>{mate.name}</span>
                                <span>{formatTRY(mate.price)}</span>
                              </div>
                              <p className="mt-1 text-[11px] text-[var(--muted)]">
                                1× {mate.item}
                              </p>
                            </Card>
                          ))}
                          <div className="flex items-center justify-between border-t border-[var(--line)] pt-2">
                            <span className="text-[12px]">Masa hesabı</span>
                            <span className="font-semibold">{formatTRY(tableTotal)}</span>
                          </div>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => flash("Garson hesabınla masaya gelecek.")}
                          >
                            Hesabı iste
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {area === "play" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {backBar("Oyun")}
                <div className="space-y-2 px-3 pb-3">
                  <p className="text-[11px] text-[var(--muted)]">
                    Masadakilerle aynı anda oynanır. Siparişi beklerken vakit
                    geçer.
                  </p>
                  {[
                    ["Pasaparola", "Harf harf yarış", "/guest/game-pasaparola.png"],
                    ["Cevap Ver", "Masaya soru aç", "/guest/game-rather.png"],
                    ["Hafıza", "Kartları eşleştir", "/guest/game-memory.png"],
                  ].map(([title, hint, image]) => (
                    <Card key={title} className="flex items-center gap-3 overflow-hidden p-2">
                      <div className="photo-box h-12 w-16 shrink-0 rounded-xl">
                        <img src={image} alt="" />
                      </div>
                      <div>
                        <p className="font-serif text-base leading-tight">{title}</p>
                        <p className="text-[10px] text-[var(--muted)]">{hint}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {area === "history" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {backBar("Geçmiş")}
                <div className="space-y-2 px-3 pb-3">
                  {[
                    ["12 Eylül", "2× Izgara kalamar, 1× Filtre kahve", 935],
                    ["30 Ağustos", "1× Sahil tost, 1× Portakallı cheesecake", 490],
                  ].map(([day, items, total]) => (
                    <Card key={String(day)} className="p-3">
                      <div className="flex justify-between text-[12px] font-medium">
                        <span>Sahil Kafe · {day}</span>
                        <span>{formatTRY(Number(total))}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">{items}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {area === "loyalty" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {backBar("Müdavim")}
                <div className="px-3 pb-3 text-center">
                  <div className="mx-auto mt-2 flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-[var(--accent-soft)]"
                    style={{
                      borderTopColor: "var(--accent)",
                      borderRightColor: "var(--accent)",
                    }}
                  >
                    <div>
                      <p className="font-serif text-3xl leading-none">7/10</p>
                      <p className="text-[10px] text-[var(--muted)]">sipariş</p>
                    </div>
                  </div>
                  <p className="mt-3 font-serif text-lg">3 sipariş sonra ikram</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Her 10 siparişte bir {GIFT_ITEM.name.toLocaleLowerCase("tr")}{" "}
                    mekândan.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="demo-phone-home" />
      </div>
      <p className="mt-3 text-center text-xs text-[var(--muted)]">
        Örnek masa · tıklayarak sipariş verin, mutfağa gitmez
      </p>
    </div>
  );
}
