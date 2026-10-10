import { DAY_END, DAY_START, LIVE_OFFERED_FROM, RACE_DATE } from "@/content/race";
import { chicagoTime } from "./time";

export type DateMode =
  | { kind: "before"; daysUntil: number }
  | { kind: "raceday"; minutes: number; liveOffered: boolean; liveByDefault: boolean }
  | { kind: "after" };

const dayNumber = (key: string) =>
  Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) / 86_400_000;

export function dateMode(now: Date): DateMode {
  const { dateKey, minutes } = chicagoTime(now);
  if (dateKey < RACE_DATE) return { kind: "before", daysUntil: dayNumber(RACE_DATE) - dayNumber(dateKey) };
  if (dateKey > RACE_DATE) return { kind: "after" };
  return {
    kind: "raceday",
    minutes,
    liveOffered: minutes >= LIVE_OFFERED_FROM && minutes < DAY_END,
    liveByDefault: minutes >= DAY_START && minutes < DAY_END,
  };
}

export function dateChip(mode: DateMode): string {
  switch (mode.kind) {
    case "before":
      return mode.daysUntil === 1 ? "Race day tomorrow" : `Race day in ${mode.daysUntil} days`;
    case "raceday":
      return "Race day today";
    case "after":
      return "Race day replay · Oct 11, 2026";
  }
}
