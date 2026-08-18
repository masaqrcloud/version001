export type DayHours = {
  day: number;
  open: string;
  close: string;
  closed: boolean;
};

export const defaultOpeningHours: DayHours[] = Array.from(
  { length: 7 },
  (_, day) => ({
    day,
    open: "09:00",
    close: "23:00",
    closed: false,
  }),
);

export function parseOpeningHours(value?: string | null): DayHours[] {
  if (!value) return defaultOpeningHours;
  try {
    const parsed = JSON.parse(value) as DayHours[];
    if (!Array.isArray(parsed) || parsed.length !== 7) {
      return defaultOpeningHours;
    }
    return defaultOpeningHours.map(
      (fallback) =>
        parsed.find((entry) => entry.day === fallback.day) ?? fallback,
    );
  } catch {
    return defaultOpeningHours;
  }
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function venueOpenState(value?: string | null, now = new Date()) {
  if (!value) {
    return {
      isOpen: true,
      label: "Açık · çalışma saatleri henüz belirtilmedi",
      today: null,
    };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday ?? "",
  );
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  const current = hour * 60 + minute;
  const hours = parseOpeningHours(value);
  const today = hours.find((entry) => entry.day === day) ?? hours[0];

  if (today.closed) {
    return { isOpen: false, label: "Bugün kapalı", today };
  }

  const open = minutes(today.open);
  const close = minutes(today.close);
  const isOpen =
    close > open
      ? current >= open && current < close
      : current >= open || current < close;

  return {
    isOpen,
    label: isOpen
      ? `Açık · ${today.close}’da kapanır`
      : `Kapalı · ${today.open}’da açılır`,
    today,
  };
}
