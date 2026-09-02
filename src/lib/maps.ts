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

export function mapsAppUrl(
  latitude: number,
  longitude: number,
  _label?: string | null,
) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}
