export function isPublicImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}

export function displayGuestName(nickname?: string | null) {
  const name = nickname?.trim();
  return name || "Misafir";
}
