"use client";

import { useEffect, useRef } from "react";
import { mapsAppUrl } from "@/lib/maps";

type VenueMapProps = {
  latitude: number;
  longitude: number;
  label?: string | null;
  address?: string | null;
  editable?: boolean;
  onMove?: (latitude: number, longitude: number) => void;
};

export function VenueMap({
  latitude,
  longitude,
  label,
  address,
  editable = false,
  onMove,
}: VenueMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);
  const labelRef = useRef(label);
  onMoveRef.current = onMove;
  labelRef.current = label;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    void (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !node) return;

      const L = leaflet.default;
      map = L.map(node, { scrollWheelZoom: true }).setView(
        [latitude, longitude],
        16,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const marker = L.circleMarker([latitude, longitude], {
        radius: 11,
        color: "#e23b2c",
        weight: 3,
        fillColor: "#e23b2c",
        fillOpacity: 1,
      }).addTo(map);

      if (editable) {
        map.on("click", (event) => {
          marker.setLatLng(event.latlng);
          onMoveRef.current?.(event.latlng.lat, event.latlng.lng);
        });
      } else {
        map.on("click", () => {
          window.open(
            mapsAppUrl(latitude, longitude, labelRef.current),
            "_blank",
            "noopener,noreferrer",
          );
        });
      }

      window.setTimeout(() => map?.invalidateSize(), 80);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [editable, latitude, longitude]);

  return (
    <div>
      {address ? (
        <p className="mb-2 text-sm text-[var(--muted)]">{address}</p>
      ) : null}
      <div
        ref={el}
        className="h-56 w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-white sm:h-72"
      />
      {editable ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Haritayı yakınlaştırabilirsin. Pin koymak için haritaya dokun.
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Yakınlaştırmak için haritayı kaydır. Dokununca harita uygulaması
          açılır.
        </p>
      )}
    </div>
  );
}
