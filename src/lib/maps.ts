export function asCoord(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function hasCoordinates(
  latitude?: unknown,
  longitude?: unknown,
) {
  return asCoord(latitude) != null && asCoord(longitude) != null;
}

function validPair(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function mapsAppUrl(
  latitude: number,
  longitude: number,
  _label?: string | null,
) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&hl=tr`;
}

export function isGoogleMapsLink(value: string) {
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    return (
      host === "google.com" ||
      host === "google.com.tr" ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      host === "maps.google.com.tr" ||
      host.endsWith(".google.com") ||
      host.endsWith(".google.com.tr")
    );
  } catch {
    return false;
  }
}

export function parseGoogleMapsCoords(source: string) {
  const place = source.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  );
  if (place) {
    const latitude = Number(place[1]);
    const longitude = Number(place[2]);
    if (validPair(latitude, longitude)) return { latitude, longitude };
  }

  const query = source.match(
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:,|%2[cC])(-?\d+(?:\.\d+)?)/i,
  );
  if (query) {
    const latitude = Number(query[1]);
    const longitude = Number(query[2]);
    if (validPair(latitude, longitude)) return { latitude, longitude };
  }

  const camera = source.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,\d+(?:\.\d+)?[zm])?/,
  );
  if (camera) {
    const latitude = Number(camera[1]);
    const longitude = Number(camera[2]);
    if (validPair(latitude, longitude)) return { latitude, longitude };
  }

  return null;
}

export function googleEmbedUrl({
  latitude,
  longitude,
  query,
  zoom = 16,
  cacheBust,
}: {
  latitude?: number | null;
  longitude?: number | null;
  query?: string | null;
  zoom?: number;
  cacheBust?: number;
}) {
  const params = new URLSearchParams();
  const lat = asCoord(latitude);
  const lng = asCoord(longitude);
  if (lat != null && lng != null) {
    params.set("q", `${lat},${lng}`);
  } else if (query?.trim()) {
    params.set("q", query.trim());
  } else {
    params.set("q", "İstanbul, Türkiye");
  }
  params.set("hl", "tr");
  params.set("gl", "TR");
  params.set("z", String(zoom));
  params.set("ie", "UTF8");
  params.set("output", "embed");
  if (cacheBust) params.set("_t", String(cacheBust));
  return `https://www.google.com/maps?${params.toString()}`;
}

export const TURKEY_CENTER = { latitude: 41.0082, longitude: 28.9784 };
