import { formatDuration } from "@/model/time";

/** Sawe's 1:59:30 world record, in minutes. */
export const RECORD_MINUTES = 119.5;

/** How much of the course a runner with this finish time has covered when Sawe finishes. */
export function laneFraction(finishMinutes: number): number {
  return Math.min(1, RECORD_MINUTES / finishMinutes);
}

/** "12.0": miles along a 26.2-mile course (v1's label). */
export function laneMiles(finishMinutes: number): string {
  return (laneFraction(finishMinutes) * 26.2).toFixed(1);
}

/** "4:30" for a duration in minutes. */
export function hoursMinutes(minutes: number): string {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** "10:18" per mile for a marathon time in minutes (v1 used 26.219 miles). */
export function pacePerMile(finishMinutes: number): string {
  const seconds = Math.round((finishMinutes / 26.219) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** What is left to run when Sawe finishes: "2h 30m". */
export function leftToRun(finishMinutes: number): string {
  return formatDuration(Math.max(0, finishMinutes - RECORD_MINUTES));
}
