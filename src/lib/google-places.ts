import {
  isGoogleMapsLink,
  parseGoogleMapsCoords,
} from "@/lib/maps";

export type MapSuggestion = {
  latitude: number;
  longitude: number;
  address: string;
};

function googleKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

function toSuggestion(
  latitude: number,
  longitude: number,
  address: string,
): MapSuggestion | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, address };
}

async function searchPlacesNew(query: string, key: string) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "tr",
        regionCode: "TR",
        maxResultCount: 8,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) return [];
  const json = (await response.json()) as {
    places?: {
      formattedAddress?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
    }[];
  };
  return (json.places ?? [])
    .map((place) =>
      toSuggestion(
        Number(place.location?.latitude),
        Number(place.location?.longitude),
        place.formattedAddress || place.displayName?.text || query,
      ),
    )
    .filter((item): item is MapSuggestion => Boolean(item));
}

async function searchPlacesLegacy(query: string, key: string) {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
  );
  url.searchParams.set("query", query);
  url.searchParams.set("language", "tr");
  url.searchParams.set("region", "tr");
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const json = (await response.json()) as {
    results?: {
      formatted_address?: string;
      name?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }[];
  };
  return (json.results ?? [])
    .slice(0, 8)
    .map((place) =>
      toSuggestion(
        Number(place.geometry?.location?.lat),
        Number(place.geometry?.location?.lng),
        place.formatted_address || place.name || query,
      ),
    )
    .filter((item): item is MapSuggestion => Boolean(item));
}

async function geocodeAddress(query: string, key: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("language", "tr");
  url.searchParams.set("region", "tr");
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const json = (await response.json()) as {
    results?: {
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }[];
  };
  return (json.results ?? [])
    .slice(0, 8)
    .map((item) =>
      toSuggestion(
        Number(item.geometry?.location?.lat),
        Number(item.geometry?.location?.lng),
        item.formatted_address || query,
      ),
    )
    .filter((item): item is MapSuggestion => Boolean(item));
}

function parseGoogleLocalSearch(payload: string, query: string) {
  const text = payload.replace(/^\)\]\}'\s*/, "");
  const quoted = [...text.matchAll(/"([^"\\]{3,180})"/g)].map((item) =>
    item[1].replace(/\\u003d/g, "="),
  );
  const needle = query.trim().toLowerCase();
  const addresses = quoted.filter((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized.includes(needle) &&
      (value.includes(",") || value.includes("/"))
    );
  });
  const titles = quoted.filter((value) => {
    const normalized = value.toLowerCase();
    return (
      normalized === needle ||
      (normalized.includes(needle) &&
        value.length <= 90 &&
        !value.startsWith("http"))
    );
  });
  const label =
    addresses.sort((a, b) => b.length - a.length)[0] || titles[0] || query;

  const seen = new Set<string>();
  const coords: MapSuggestion[] = [];
  for (const match of text.matchAll(/@(-?\d+\.\d+),(-?\d+\.\d+)/g)) {
    const item = toSuggestion(Number(match[1]), Number(match[2]), label);
    if (!item) continue;
    const key = `${item.latitude.toFixed(6)},${item.longitude.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    coords.push(item);
  }
  return coords.slice(0, 8).map((item, index) => ({
    ...item,
    address: addresses[index] || label,
  }));
}

async function searchGoogleMapsTurkey(query: string) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("tbm", "map");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "tr");
  url.searchParams.set("gl", "tr");
  url.searchParams.set("nfpr", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/json",
        "Accept-Language": "tr-TR,tr;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return parseGoogleLocalSearch(await response.text(), query);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function nominatimSearch(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "tr");
  url.searchParams.set("countrycodes", "tr");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MasaQR/1.0 (masaqr.cloud@gmail.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const results = (await response.json()) as {
    lat?: string;
    lon?: string;
    display_name?: string;
  }[];
  return results
    .map((item) =>
      toSuggestion(
        Number(item.lat),
        Number(item.lon),
        item.display_name ?? query,
      ),
    )
    .filter((item): item is MapSuggestion => Boolean(item));
}

export async function reverseGeocode(latitude: number, longitude: number) {
  const key = googleKey();
  if (key) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("language", "tr");
    url.searchParams.set("region", "tr");
    url.searchParams.set("key", key);
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      const json = (await response.json()) as {
        results?: { formatted_address?: string }[];
      };
      const address = json.results?.[0]?.formatted_address?.trim();
      if (address) return address;
    }
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("accept-language", "tr");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MasaQR/1.0 (masaqr.cloud@gmail.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { display_name?: string };
  return json.display_name?.trim() || null;
}

export async function resolveGoogleMapsLink(input: string) {
  const trimmed = input.trim();
  const direct = parseGoogleMapsCoords(trimmed);
  if (direct) {
    const address = (await reverseGeocode(direct.latitude, direct.longitude)) ?? trimmed;
    return { ...direct, address };
  }
  if (!isGoogleMapsLink(trimmed)) return null;

  try {
    const response = await fetch(trimmed, {
      redirect: "follow",
      headers: {
        Accept: "text/html",
        "User-Agent": "MasaQR/1.0 (https://masaqr.net)",
      },
      cache: "no-store",
    });
    const fromUrl = parseGoogleMapsCoords(response.url);
    if (fromUrl) {
      const address =
        (await reverseGeocode(fromUrl.latitude, fromUrl.longitude)) ?? trimmed;
      return { ...fromUrl, address };
    }
    const html = (await response.text()).slice(0, 250_000);
    const fromHtml = parseGoogleMapsCoords(html);
    if (!fromHtml) return null;
    const address =
      (await reverseGeocode(fromHtml.latitude, fromHtml.longitude)) ?? trimmed;
    return { ...fromHtml, address };
  } catch {
    return null;
  }
}

export async function searchLocations(query: string): Promise<MapSuggestion[]> {
  const key = googleKey();
  if (key) {
    const fresh = await searchPlacesNew(query, key);
    if (fresh.length) return fresh;
    const legacy = await searchPlacesLegacy(query, key);
    if (legacy.length) return legacy;
    const geo = await geocodeAddress(query, key);
    if (geo.length) return geo;
  }

  const google = await searchGoogleMapsTurkey(query);
  if (google.length) return google;
  if (!/türkiye|turkey/i.test(query)) {
    const biased = await searchGoogleMapsTurkey(`${query} Türkiye`);
    if (biased.length) return biased;
  }
  return nominatimSearch(query);
}
