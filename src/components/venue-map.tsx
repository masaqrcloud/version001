"use client";

import { useEffect, useRef, useState } from "react";
import {
  asCoord,
  googleEmbedUrl,
  mapsAppUrl,
  TURKEY_CENTER,
} from "@/lib/maps";
import {
  googleMapsBrowserKey,
  loadGoogleMaps,
} from "@/lib/google-maps-loader";

type VenueMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
  address?: string | null;
  editable?: boolean;
  onMove?: (latitude: number, longitude: number) => void;
};

function openInGoogle(
  latitude: number,
  longitude: number,
  label?: string | null,
) {
  window.open(
    mapsAppUrl(latitude, longitude, label),
    "_blank",
    "noopener,noreferrer",
  );
}

function GoogleEmbed({
  latitude,
  longitude,
  label,
  address,
  zoom,
  editable,
}: {
  latitude: number | null;
  longitude: number | null;
  label?: string | null;
  address?: string | null;
  zoom: number;
  editable: boolean;
}) {
  const [epoch, setEpoch] = useState(0);
  const hiddenAt = useRef<number | null>(null);
  const placed = latitude != null && longitude != null;

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
      hiddenAt.current = null;
      if (away >= 120_000) setEpoch(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const src = googleEmbedUrl({
    latitude,
    longitude,
    query: address,
    zoom,
    cacheBust: epoch,
  });

  return (
    <div>
      {address ? (
        <p className="mb-2 text-sm text-[var(--muted)]">{address}</p>
      ) : null}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <iframe
          key={`${src}`}
          title={label ? `${label} konumu` : "Mekan konumu"}
          src={src}
          className="h-56 w-full sm:h-72"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        {placed ? (
          <a
            href={mapsAppUrl(latitude, longitude, label)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow"
          >
            Google Haritalar'da aç
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {editable
          ? "Harita Google Haritalar Türkiye verisiyle canlı. Öneriden seç, bağlantı yapıştır veya pini haritaya koy."
          : "Harita Google Haritalar'dan canlı açılır; yeni yollar ve işletmeler kendiliğinden güncellenir. Yakınlaştırmak için kaydır."}
      </p>
    </div>
  );
}

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
  const key = googleMapsBrowserKey();
  const [mode, setMode] = useState<"js" | "embed">(key ? "js" : "embed");

  useEffect(() => {
    if (mode !== "js") return;
    const node = el.current;
    if (!node) return;
    let cancelled = false;
    let map: google.maps.Map | undefined;
    let marker: google.maps.Marker | undefined;

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !node) return;
        const startLat = lat ?? TURKEY_CENTER.latitude;
        const startLng = lng ?? TURKEY_CENTER.longitude;
        map = new maps.Map(node, {
          center: { lat: startLat, lng: startLng },
          zoom: placed ? 17 : 11,
          mapTypeId: "roadmap",
          gestureHandling: "greedy",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: true,
          keyboardShortcuts: false,
        });

        const color = "#e23b2c";
        const placeMarker = (position: google.maps.LatLngLiteral) => {
          if (marker) {
            marker.setPosition(position);
            return marker;
          }
          marker = new maps.Marker({
            position,
            map,
            draggable: editable,
            animation: maps.Animation.DROP,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
          if (editable) {
            marker.addListener("dragend", () => {
              const next = marker?.getPosition();
              if (!next) return;
              onMoveRef.current?.(next.lat(), next.lng());
            });
          }
          return marker;
        };

        if (placed) placeMarker({ lat: startLat, lng: startLng });

        if (editable) {
          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            const next = event.latLng;
            if (!next) return;
            placeMarker({ lat: next.lat(), lng: next.lng() });
            onMoveRef.current?.(next.lat(), next.lng());
          });
        } else if (placed) {
          map.addListener("click", () => {
            openInGoogle(startLat, startLng, labelRef.current);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setMode("embed");
      });

    return () => {
      cancelled = true;
      marker?.setMap(null);
    };
  }, [editable, lat, lng, mode, placed]);

  if (mode === "embed") {
    return (
      <GoogleEmbed
        latitude={lat}
        longitude={lng}
        label={label}
        address={address}
        zoom={placed ? 17 : 11}
        editable={editable}
      />
    );
  }

  return (
    <div>
      {address ? (
        <p className="mb-2 text-sm text-[var(--muted)]">{address}</p>
      ) : null}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div ref={el} className="h-56 w-full sm:h-72" />
        {placed ? (
          <button
            type="button"
            className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow"
            onClick={() => openInGoogle(lat, lng, label)}
          >
            Google Haritalar'da aç
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {editable
          ? "Harita Google Haritalar Türkiye verisiyle canlı. Öneriden seç veya pini haritaya koy / sürükle."
          : "Harita Google Haritalar'dan canlı açılır; yeni yollar ve işletmeler kendiliğinden güncellenir. Yakınlaştırmak için kaydır, dokununca uygulama açılır."}
      </p>
    </div>
  );
}
