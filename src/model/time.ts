export function formatClock(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The parts of a clock time, for displays that lay them out themselves (the rolling clock). */
export function clockParts(minutes: number): { hour: number; minute: number; meridiem: "AM" | "PM" } {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60) % 24;
  return { hour: h % 12 || 12, minute: m % 60, meridiem: h < 12 ? "AM" : "PM" };
}

export function formatShort(minutes: number): string {
  return formatClock(minutes).replace(":00 ", " ").replace(" AM", "a").replace(" PM", "p");
}

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h ${mm}m` : `${mm}m`;
}

const CHICAGO = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Chicago's local date ("2026-10-11") and minutes after local midnight. */
export function chicagoTime(date: Date): { dateKey: string; minutes: number } {
  const p = Object.fromEntries(CHICAGO.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    dateKey: `${p.year}-${p.month}-${p.day}`,
    minutes: Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60,
  };
}
