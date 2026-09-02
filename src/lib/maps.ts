export function hasCoordinates(
  latitude?: number | null,
  longitude?: number | null,
) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

export function mapsAppUrl(
  latitude: number,
  longitude: number,
  label?: string | null,
) {
  const query = label?.trim()
    ? `${label.trim()}@${latitude},${longitude}`
    : `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
