export function isPublicImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}

export function displayGuestName(nickname?: string | null) {
  const name = nickname?.trim();
  return name || "Misafir";
}

export function isStaffProxyNickname(nickname?: string | null) {
  const name = nickname?.trim() ?? "";
  return (
    name === "Garson yazdı" ||
    name === "Personel" ||
    name.startsWith("Personel ·")
  );
}

export function sittingIsOccupied(
  guests: { nickname?: string | null }[],
  orderCount: number,
) {
  return (
    orderCount > 0 ||
    guests.some((guest) => !isStaffProxyNickname(guest.nickname))
  );
}
