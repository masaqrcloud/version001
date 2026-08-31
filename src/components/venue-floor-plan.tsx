"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePoll } from "@/lib/poll";
import { autoFloorPosition, clusteredPosition } from "@/lib/table-groups";
import { formatTRY } from "@/lib/utils";
import { tableLabel } from "@/lib/table-label";

type FloorTable = {
  id: string;
  number: string;
  floorX: number | null;
  floorY: number | null;
  occupied: boolean;
  reserved: boolean;
  sessionId: string | null;
  primaryTableId: string | null;
  mergedLabel: string | null;
  isMerged: boolean;
  isPrimary: boolean;
  guestCount: number;
  orderCount: number;
  pendingCount: number;
  waiterCalledAt: string | null;
  billRequestedAt: string | null;
  total: number;
};

type FloorResponse = {
  tables: FloorTable[];
  summary: {
    total: number;
    occupied: number;
    available: number;
    guests: number;
  };
};

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 19.2C2 15.8 5.1 13 9 13s7 2.8 7 6.2c0 1-.8 1.8-1.8 1.8H3.8c-1 0-1.8-.8-1.8-1.8Zm14.2-6.1c3.3.3 5.8 2.6 5.8 5.4 0 .8-.7 1.5-1.5 1.5h-2.6c.1-.3.1-.5.1-.8 0-2.4-1.2-4.5-3.1-5.9.4-.1.8-.2 1.3-.2Z"
      />
    </svg>
  );
}

function TableShape({ occupied }: { occupied: boolean }) {
  const surface = occupied
    ? "border-red-300 bg-red-100 text-red-900 shadow-red-200/70"
    : "border-emerald-300 bg-emerald-100 text-emerald-900 shadow-emerald-200/70";
  const chair = occupied ? "bg-red-300" : "bg-emerald-300";

  return (
    <div className="relative mx-auto h-28 w-32" aria-hidden="true">
      <span
        className={`absolute left-1/2 top-0 h-4 w-10 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute left-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-md ${chair}`}
      />
      <span
        className={`absolute right-0 top-1/2 h-10 w-4 -translate-y-1/2 rounded-md ${chair}`}
      />
      <div
        className={`absolute inset-x-6 inset-y-5 flex items-center justify-center rounded-[1.4rem] border-2 shadow-lg ${surface}`}
      >
        <span className="h-3 w-3 rounded-full bg-current opacity-70" />
      </div>
    </div>
  );
}

type Position = { x: number; y: number };

function FloorCard({ table }: { table: FloorTable }) {
  const taken = table.occupied || table.reserved;
  return (
    <Card
      className={`relative overflow-hidden p-3 shadow-lg transition ${
        taken
          ? "border-red-200 bg-red-50/95"
          : "border-emerald-200 bg-emerald-50/95"
      }`}
    >
      {table.billRequestedAt ? (
        <span className="absolute right-2 top-2 z-10 animate-pulse rounded-full bg-[var(--accent)] px-2 py-1 text-[9px] font-semibold text-white">
          Hesap
        </span>
      ) : table.waiterCalledAt ? (
        <span className="absolute right-2 top-2 z-10 animate-pulse rounded-full bg-[var(--accent)] px-2 py-1 text-[9px] font-semibold text-white">
          Garson çağrısı
        </span>
      ) : table.isMerged ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-red-700 px-2 py-1 text-[9px] font-semibold text-white">
          Birleşik {table.mergedLabel}
        </span>
      ) : table.reserved && !table.occupied ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-red-700 px-2 py-1 text-[9px] font-semibold text-white">
          Rezerve
        </span>
      ) : null}
      <div className="scale-75">
        <TableShape occupied={taken} />
      </div>
      <div className="-mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="font-serif text-xl">{tableLabel(table.number)}</p>
          <p
            className={`text-xs font-medium ${
              taken ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {table.occupied ? "Dolu" : table.reserved ? "Rezerve" : "Boş"}
            {table.isMerged && table.mergedLabel
              ? ` · ${table.mergedLabel}`
              : ""}
          </p>
        </div>
        {table.occupied ? (
          <div className="text-right text-[10px] text-[var(--muted)]">
            <p className="flex items-center justify-end gap-1">
              <PeopleIcon />
              {table.guestCount} kişi
            </p>
            <p>
              {table.orderCount} sipariş
              {table.pendingCount ? ` · ${table.pendingCount} aktif` : ""}
            </p>
            <p className="font-medium text-[var(--ink)]">
              {formatTRY(table.total)}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function VenueFloorPlan({
  emptyHref,
  editable = false,
}: {
  emptyHref?: string;
  editable?: boolean;
}) {
  const { data, error } = usePoll<FloorResponse>("/api/staff/floor", 3000);
  const router = useRouter();
  const floorRef = useRef<HTMLDivElement>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Position>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function tablePosition(
    table: FloorTable,
    index: number,
    total: number,
  ): Position {
    if (draft[table.id]) return draft[table.id];
    if (editing) {
      return table.floorX !== null && table.floorY !== null
        ? { x: table.floorX, y: table.floorY }
        : autoFloorPosition(index, total);
    }
    return clusteredPosition(table, data?.tables ?? [], index, total);
  }

  function pointerPosition(event: PointerEvent<HTMLDivElement>): Position | null {
    const bounds = floorRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(
        70,
        Math.min(930, Math.round(((event.clientX - bounds.left) / bounds.width) * 1000)),
      ),
      y: Math.max(
        100,
        Math.min(900, Math.round(((event.clientY - bounds.top) / bounds.height) * 1000)),
      ),
    };
  }

  async function savePosition(tableId: string, position: Position) {
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/admin/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ floorX: position.x, floorY: position.y }),
      });
      if (!response.ok) throw new Error("save failed");
    } catch {
      setSaveError("Masa konumu kaydedilemedi. Tekrar sürükleyip deneyin.");
    } finally {
      setSaving(false);
    }
  }

  async function openEmptyTable(tableId: string) {
    if (openingId) return;
    setOpeningId(tableId);
    try {
      const response = await fetch("/api/staff/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(json.error ?? "Masa açılamadı");
        return;
      }
      router.push(`/staff/waiter/${json.id}/order`);
    } finally {
      setOpeningId(null);
    }
  }

  async function arrangeAutomatically() {
    if (!data) return;
    const positions = Object.fromEntries(
      data.tables.map((table, index) => [
        table.id,
        autoFloorPosition(index, data.tables.length),
      ]),
    );
    setDraft(positions);
    setSaving(true);
    setSaveError(null);
    try {
      const responses = await Promise.all(
        data.tables.map((table) => {
          const position = positions[table.id];
          return fetch(`/api/admin/tables/${table.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              floorX: position.x,
              floorY: position.y,
            }),
          });
        }),
      );
      if (responses.some((response) => !response.ok)) {
        throw new Error("save failed");
      }
    } catch {
      setSaveError("Otomatik yerleşim kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-kicker">Canlı salon</p>
          <h2 className="font-serif text-3xl">Masa krokisi</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {editing
              ? "Masaları sürükleyin; bıraktığınız konum otomatik kaydedilir."
              : "QR okutulan masalar en geç 3 saniye içinde dolu görünür."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
                {data.summary.available} boş
              </span>
          <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">
                {data.summary.occupied} dolu / rezerve
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1.5">
                {data.summary.guests} misafir
              </span>
            </div>
          ) : null}
          {editable ? (
            <>
              {editing ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void arrangeAutomatically()}
                >
                  Otomatik diz
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={editing ? "secondary" : "outline"}
                disabled={saving}
                onClick={() => setEditing((current) => !current)}
              >
                {editing ? "Düzenlemeyi bitir" : "Yerleşimi düzenle"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <p className="mt-3 text-sm text-red-700">{saveError}</p>
      ) : null}
      {saving ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Kaydediliyor…</p>
      ) : null}

      <div className="mt-5 rounded-[2rem] border border-[var(--line)] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(237,226,211,0.75))] p-4 shadow-inner sm:p-7">
        <div className="mb-3 flex items-center justify-between border-b border-dashed border-[var(--line)] pb-3 text-xs text-[var(--muted)]">
          <span>Salon girişi</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {editing ? "Düzenleme modu" : "Canlı"}
          </span>
        </div>

        {!data && !error ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Salon hazırlanıyor…
          </p>
        ) : null}
        {error ? (
          <p className="py-12 text-center text-sm text-red-700">
            Masa bilgileri alınamadı.
          </p>
        ) : null}
        {data?.tables.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Henüz masa eklenmemiş.
          </p>
        ) : null}

        {data?.tables.length ? (
          <div className="-mx-1 overflow-x-auto touch-pan-x">
            <p className="mb-2 text-center text-[11px] text-[var(--muted)] sm:hidden">
              Krokiyi yana kaydır · boş masaya basınca sipariş yazarsın
            </p>
          <div
            ref={floorRef}
            className="relative h-[480px] w-[720px] overflow-hidden rounded-[1.5rem] border border-dashed border-black/10 bg-white/20 sm:h-[680px] sm:w-full"
          >
            {data.tables.map((table, index) => {
              const position = tablePosition(
                table,
                index,
                data.tables.length,
              );
              const content = <FloorCard table={table} />;
              const linkedContent = table.sessionId ? (
                <Link href={`/staff/waiter/${table.sessionId}`}>{content}</Link>
              ) : emptyHref ? (
                <Link href={emptyHref}>{content}</Link>
              ) : (
                <button
                  type="button"
                  className="block w-full text-left"
                  disabled={openingId === table.id}
                  onClick={() => void openEmptyTable(table.id)}
                >
                  {content}
                </button>
              );

              return (
                <div
                  key={table.id}
                  className={`absolute w-[120px] -translate-x-1/2 -translate-y-1/2 select-none sm:w-[190px] ${
                    editing
                      ? "cursor-grab touch-none active:cursor-grabbing"
                      : "transition-[left,top] duration-300"
                  } ${dragging === table.id ? "z-20 scale-105" : "z-10"}`}
                  style={{
                    left: `${position.x / 10}%`,
                    top: `${position.y / 10}%`,
                  }}
                  onPointerDown={(event) => {
                    if (!editing) return;
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(table.id);
                  }}
                  onPointerMove={(event) => {
                    if (!editing || dragging !== table.id) return;
                    const next = pointerPosition(event);
                    if (next) {
                      setDraft((current) => ({
                        ...current,
                        [table.id]: next,
                      }));
                    }
                  }}
                  onPointerUp={(event) => {
                    if (!editing || dragging !== table.id) return;
                    const next = pointerPosition(event);
                    setDragging(null);
                    if (next) {
                      setDraft((current) => ({
                        ...current,
                        [table.id]: next,
                      }));
                      void savePosition(table.id, next);
                    }
                  }}
                >
                  {editing ? content : linkedContent}
                </div>
              );
            })}
          </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
