"use client";

import { useMemo, useState } from "react";
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
  tag: string;
  category: string;
};

type DemoLine = DemoItem & { qty: number };

const DEMO_ITEMS: DemoItem[] = [
  {
    id: "kalamar",
    name: "Izgara kalamar",
    description: "Limon ve ev yeşilliği",
    price: 420,
    calories: 186,
    tag: "Gluten",
    category: "Mutfak",
  },
  {
    id: "tost",
    name: "Sahil tost",
    description: "Cheddar, domates, pesto",
    price: 280,
    calories: 340,
    tag: "Gluten · Süt",
    category: "Mutfak",
  },
  {
    id: "cheesecake",
    name: "Portakallı cheesecake",
    description: "Günün dilimi",
    price: 210,
    calories: 290,
    tag: "Süt · Gluten",
    category: "Tatlı",
  },
  {
    id: "kahve",
    name: "Filtre kahve",
    description: "200 ml",
    price: 95,
    calories: 8,
    tag: "",
    category: "İçecek",
  },
];

type Tab = "menu" | "cart" | "bill";

export function HomeGuestDemo() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("menu");
  const [cart, setCart] = useState<DemoLine[]>([]);
  const [orders, setOrders] = useState<DemoLine[]>([]);
  const [pulse, setPulse] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const billTotal = orders.reduce((sum, line) => sum + line.price * line.qty, 0);
  const guestLabel = name.trim() || "Misafir";

  const grouped = useMemo(() => {
    const map = new Map<string, DemoItem[]>();
    for (const item of DEMO_ITEMS) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, []);

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
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
    window.setTimeout(() => setPulse(false), 550);
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

  function sendOrder() {
    if (!cart.length) return;
    setOrders((current) => [...cart, ...current]);
    setCart([]);
    setTab("bill");
    flash("Sipariş mutfağa iletildi.");
  }

  return (
    <div className="demo-phone">
      <div className="demo-phone-bezel">
        <div className="demo-phone-island" />
        <div className="demo-phone-screen">
          <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-semibold text-[var(--ink)]">
            <span>21:14</span>
            <span>MasaQR</span>
            <span>5G</span>
          </div>

          <div
            className="h-20 w-full"
            style={{
              background:
                "linear-gradient(135deg, #ff5a3c 0%, #e23b2c 45%, #e89b1a 100%)",
            }}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]">
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Sahil Kafe
              </p>
              <p className="font-serif text-2xl leading-tight">Masa 12</p>
              <p className="text-[11px] text-[var(--muted)]">
                {joined ? `Merhaba, ${guestLabel}` : "QR okutuldu · örnek masa"}
              </p>
              <button
                type="button"
                className="mt-2 w-full rounded-xl bg-sky-50 px-3 py-2 text-left text-[11px]"
                onClick={() => {
                  setWifiCopied(true);
                  window.setTimeout(() => setWifiCopied(false), 1600);
                }}
              >
                <p className="font-semibold text-sky-800">Misafir Wi‑Fi</p>
                <p className="text-[var(--ink)]">
                  Sahil_Guest · {wifiCopied ? "Kopyalandı" : "sifre123"}
                </p>
              </button>
            </div>

            {!joined ? (
              <div className="flex flex-1 flex-col justify-center px-4 pb-4">
                <p className="font-serif text-2xl">Masaya katıl</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                  Adınızı yazarak veya isimsiz devam ederek örnek masaya
                  oturun. Sipariş gerçek mutfağa gitmez.
                </p>
                <form
                  className="mt-4 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setJoined(true);
                  }}
                >
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Adınız (ör. Emirhan)"
                    maxLength={24}
                  />
                  <Button type="submit" className="w-full" size="sm">
                    Adımla katıl
                  </Button>
                </form>
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--muted)] underline-offset-4 hover:underline"
                  onClick={() => setJoined(true)}
                >
                  İsimsiz devam et
                </button>
              </div>
            ) : (
              <>
                <div className="px-3 pb-2">
                  <div className="grid grid-cols-3 gap-1 rounded-full bg-black/5 p-1">
                    {(
                      [
                        ["menu", "Menü"],
                        ["cart", "Sepet"],
                        ["bill", "Adisyon"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`relative min-h-8 rounded-full text-[11px] font-medium ${
                          tab === key
                            ? "bg-[var(--ink)] text-[var(--bg)]"
                            : "text-[var(--ink)]"
                        } ${key === "cart" && pulse ? "cart-pulse" : ""}`}
                      >
                        {label}
                        {key === "cart" && cartCount > 0 ? (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] text-white">
                            {cartCount}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                {notice ? (
                  <p className="mx-3 mb-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                    {notice}
                  </p>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                  {tab === "menu"
                    ? grouped.map(([category, items]) => (
                        <section key={category} className="mb-4">
                          <h3 className="mb-2 font-serif text-lg">{category}</h3>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <Card
                                key={item.id}
                                className="flex items-start gap-2 p-2"
                              >
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
                                  {item.tag ? (
                                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                                      {item.tag}
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
                      ))
                    : null}

                  {tab === "cart" ? (
                    cart.length === 0 ? (
                      <p className="pt-8 text-center text-xs text-[var(--muted)]">
                        Sepet boş. Menüden ürün ekleyin.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((line) => (
                          <Card
                            key={line.id}
                            className="flex items-center justify-between gap-2 p-3"
                          >
                            <div>
                              <p className="text-[13px] font-medium">
                                {line.name}
                              </p>
                              <p className="text-[11px] text-[var(--muted)]">
                                {formatTRY(line.price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-black/5 text-sm"
                                onClick={() => changeQty(line.id, -1)}
                              >
                                −
                              </button>
                              <span className="w-4 text-center text-sm">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                className="h-7 w-7 rounded-full bg-black/5 text-sm"
                                onClick={() => changeQty(line.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          </Card>
                        ))}
                        <p className="pt-1 text-right text-sm font-semibold">
                          {formatTRY(cartTotal)}
                        </p>
                        <Button className="w-full" size="sm" onClick={sendOrder}>
                          Mutfağa gönder
                        </Button>
                      </div>
                    )
                  ) : null}

                  {tab === "bill" ? (
                    orders.length === 0 ? (
                      <p className="pt-8 text-center text-xs text-[var(--muted)]">
                        Henüz sipariş yok.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {orders.map((line, index) => (
                          <Card key={`${line.id}-${index}`} className="p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                              Mutfakta
                            </p>
                            <p className="text-[13px] font-medium">
                              {line.name} × {line.qty}
                            </p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {formatTRY(line.price * line.qty)}
                            </p>
                          </Card>
                        ))}
                        <p className="pt-1 text-right text-sm font-semibold">
                          {formatTRY(billTotal)}
                        </p>
                      </div>
                    )
                  ) : null}
                </div>
              </>
            )}
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
