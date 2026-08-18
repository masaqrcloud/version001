export function istanbulDayBounds(date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return {
    day,
    start: new Date(`${day}T00:00:00+03:00`),
    end: new Date(`${day}T23:59:59.999+03:00`),
  };
}
