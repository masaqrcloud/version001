const SLOT_MINUTES = 90;

export function istanbulToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

export function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + (minute || 0);
}

export function reservationTimesOverlap(a: string, b: string) {
  return Math.abs(timeToMinutes(a) - timeToMinutes(b)) < SLOT_MINUTES;
}
