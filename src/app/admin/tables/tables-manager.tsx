"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { makeQr } from "@/lib/qr-with-logo";

type TableRow = {
  id: string;
  number: string;
  qrToken: string;
  openGuests: number;
  isOpen: boolean;
};

type TableCard = TableRow & {
  url: string;
  qrDataUrl: string;
};

function toCard(table: TableRow, origin: string): TableCard {
  return {
    ...table,
    url: `${origin}/t/${table.qrToken}`,
    qrDataUrl: "",
  };
}

function QrFace({
  src,
  alt,
  logoUrl,
}: {
  src: string;
  alt: string;
  logoUrl?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: 168,
        height: 168,
        margin: "16px auto 0",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: 168,
          height: 168,
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "#fff",
          display: "block",
        }}
      />
      {logoUrl ? (
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            zIndex: 2,
            display: "flex",
            width: 52,
            height: 52,
            transform: "translate(-50%, -50%)",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 0 0 3px #fff",
          }}
        >
          <img
            src={logoUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "none",
              objectFit: "contain",
            }}
          />
        </span>
      ) : null}
    </div>
  );
}

export function TablesManager({
  initialTables,
  phoneOrigin,
  logoUrl,
}: {
  initialTables: TableRow[];
  phoneOrigin: string;
  logoUrl?: string | null;
}) {
  const [venueLogo, setVenueLogo] = useState(logoUrl ?? "");
  const [number, setNumber] = useState("");
  const [origin, setOrigin] = useState(phoneOrigin);
  const [tables, setTables] = useState<TableCard[]>(() =>
    initialTables.map((table) => toCard(table, phoneOrigin)),
  );
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (logoUrl) setVenueLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    let cancelled = false;

    async function refreshVenue() {
      try {
        const res = await fetch("/api/admin/venue", { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !data?.logoUrl) return;
        setVenueLogo(data.logoUrl);
      } catch {
        // Prop'taki logo ile devam.
      }
    }

    async function refreshOrigin() {
      try {
        const res = await fetch("/api/public-origin", { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !data.origin) return;
        setOrigin((current) => (current === data.origin ? current : data.origin));
        setTables((current) => {
          const next = current.map((table) => {
            const url = `${data.origin}/t/${table.qrToken}`;
            if (table.url === url) return table;
            return { ...table, url, qrDataUrl: "" };
          });
          return next.every((table, index) => table === current[index])
            ? current
            : next;
        });
      } catch {
        // Mevcut origin ile devam.
      }
    }

    void refreshVenue();
    void refreshOrigin();
    return () => {
      cancelled = true;
    };
  }, []);

  const qrKey = tables.map((table) => `${table.id}:${table.url}`).join(",");

  useEffect(() => {
    let cancelled = false;

    async function loadQr(table: TableCard) {
      try {
        const qrDataUrl = await makeQr(table.url);
        if (cancelled) return;
        setTables((current) =>
          current.map((item) =>
            item.id === table.id && item.url === table.url && !item.qrDataUrl
              ? { ...item, qrDataUrl }
              : item,
          ),
        );
      } catch {
        // QR sonra da yüklenebilir; masa listesi durur.
      }
    }

    for (const table of tables) {
      if (!table.qrDataUrl) void loadQr(table);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrKey]);

  async function createTable(event: FormEvent) {
    event.preventDefault();
    const value = number.trim();
    if (!value) {
      setError("Masa numarası yaz");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ number: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Masa eklenemedi");
        return;
      }
      const card = toCard(
        {
          id: data.id,
          number: data.number,
          qrToken: data.qrToken,
          openGuests: 0,
          isOpen: false,
        },
        origin,
      );
      setTables((current) =>
        [...current, card].sort((a, b) => a.number.localeCompare(b.number, "tr")),
      );
      setNumber("");
      setPopup(`Masa ${data.number} eklendi.`);
    } catch {
      setError("Masa eklenemedi, tekrar dene");
    } finally {
      setBusy(false);
    }
  }

  async function removeTable(id: string) {
    const res = await fetch(`/api/admin/tables/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      setError("Silinemedi");
      return;
    }
    setTables((current) => current.filter((table) => table.id !== id));
    setPopup("Masa silindi.");
  }

  function printQr(table: TableCard) {
    const popupWindow = window.open("", "_blank", "width=420,height=560");
    if (!popupWindow) return;
    const logoHtml = venueLogo
      ? `<span class="logo"><img src="${venueLogo}" alt="" /></span>`
      : "";
    popupWindow.document.write(`<!doctype html><html><head><title>Masa ${table.number}</title>
      <style>
        body { font-family: Georgia, serif; text-align: center; padding: 32px; color: #1f1a14; }
        .qr { position: relative; width: 260px; height: 260px; margin: 0 auto; }
        .qr > img { width: 260px; height: 260px; }
        .logo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .logo img { width: 72px; height: 72px; object-fit: contain; background: #fff; padding: 4px; border-radius: 16px; box-shadow: 0 0 0 4px #fff; }
        h1 { font-size: 32px; margin: 16px 0 8px; }
        p { color: #7a7168; }
      </style></head><body>
      <p>MasaQR</p>
      <h1>Masa ${table.number}</h1>
      ${
        table.qrDataUrl
          ? `<div class="qr"><img src="${table.qrDataUrl}" alt="QR" />${logoHtml}</div>`
          : ""
      }
      <p>${table.url}</p>
      <script>window.onload = () => window.print()</script>
      </body></html>`);
    popupWindow.document.close();
  }

  const phoneReady = !origin.includes("localhost") && !origin.includes("127.0.0.1");

  return (
    <div className="mt-8">
      <Popup message={popup} onClose={() => setPopup(null)} />
      <p className="mb-1 text-sm">
        Telefon adresi: <span className="font-medium">{origin}</span>
      </p>
      <p className="mb-4 text-sm text-[var(--muted)]">
        {phoneReady
          ? "WiFi değiştiyse sunucuyu o ağdayken yeniden başlat, sonra bu sayfayı yenile."
          : "Telefondan denemek için aynı WiFi’de ol. Sonra sunucuyu durdurup yeniden başlat; QR o anki IP ile oluşur."}
      </p>
      <Card className="mb-6 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={createTable}>
          <div className="min-w-40 flex-1">
            <Label htmlFor="table-number">Yeni masa no</Label>
            <Input
              id="table-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="4"
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Ekleniyor…" : "Masa ekle"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </Card>

      {tables.length === 0 ? (
        <p className="text-[var(--muted)]">Henüz masa yok. Yukarıdan ekle.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl">Masa {table.number}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {table.isOpen
                      ? `Açık · ${table.openGuests} misafir`
                      : "Boş"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void removeTable(table.id)}
                >
                  Sil
                </Button>
              </div>
              {table.qrDataUrl ? (
                <QrFace
                  src={table.qrDataUrl}
                  alt={`Masa ${table.number} QR`}
                  logoUrl={venueLogo || undefined}
                />
              ) : (
                <p className="mt-4 text-center text-sm text-[var(--muted)]">
                  QR hazırlanıyor…
                </p>
              )}
              <p className="mt-3 break-all text-center text-xs text-[var(--muted)]">
                {table.url}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => printQr(table)}
                >
                  Yazdır
                </Button>
                <a href={`/t/${table.qrToken}?preview=1`} className="flex-1">
                  <Button className="w-full" variant="secondary">
                    Önizle
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
