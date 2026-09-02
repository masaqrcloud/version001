"use client";

import { useEffect, useRef } from "react";
import { asCoord, mapsAppUrl } from "@/lib/maps";

const FALLBACK = { latitude: 41.0082, longitude: 28.9784, zoom: 11 };

type VenueMapProps = {
  latitude?: number | null;
  longitude?: number | null;
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
  const lat = asCoord(latitude);
  const lng = asCoord(longitude);
  const placed = lat != null && lng != null;

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
      const startLat = lat ?? FALLBACK.latitude;
      const startLng = lng ?? FALLBACK.longitude;
      map = L.map(node, { scrollWheelZoom: true }).setView(
        [startLat, startLng],
        placed ? 16 : FALLBACK.zoom,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      let marker: import("leaflet").CircleMarker | null = placed
        ? L.circleMarker([startLat, startLng], {
            radius: 11,
            color: "#e23b2c",
            weight: 3,
            fillColor: "#e23b2c",
            fillOpacity: 1,
          }).addTo(map)
        : null;

      if (editable) {
        map.on("click", (event) => {
          if (marker) {
            marker.setLatLng(event.latlng);
          } else {
            marker = L.circleMarker(event.latlng, {
              radius: 11,
              color: "#e23b2c",
              weight: 3,
              fillColor: "#e23b2c",
              fillOpacity: 1,
            }).addTo(map!);
          }
          onMoveRef.current?.(event.latlng.lat, event.latlng.lng);
        });
      } else if (placed) {
        map.on("click", () => {
          window.open(
            mapsAppUrl(startLat, startLng, labelRef.current),
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
  }, [editable, lat, lng, placed]);

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
          Öneriden seç veya haritaya dokunarak pini koy. Kaydırarak
          yakınlaştırabilirsin.
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
