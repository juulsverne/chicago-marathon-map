// Race-day constants. Times are minutes after midnight, Central Time.

export const RACE_DATE = "2026-10-11"; // Chicago local date
export const DAY_START = 300; // 5:00 AM, the start of the timeline
export const DAY_END = 1140; // 7:00 PM, the end of the timeline
export const STREETS_CLOSE = 360; // 6:00 AM
export const OPENING_TIME = 350; // 5:50 AM, where a replay opens
export const LIVE_OFFERED_FROM = 240; // 4:00 AM on race day

// More than 55,000 runners are expected in 2026 (the City's race notice, S3; S6 in src/content/sources.ts).
// The UI shows counts of the 5,300 modeled runners scaled to this field (people() in src/model/runners.ts).
export const FIELD = 55_000;
export const MODEL_RUNNERS = 5_300; // modeled runners: one per 10 people at the High tier
export const RUNNER_SEED = 1011;
export const COURSE_MILES = 26.219; // runner distance is normalized to this along the traced route

// At the default speed, skim the quiet stretch between the closures and the gun.
export const SKIM = { from: 362, to: 440, factor: 4, atSpeed: 5 } as const;

/** The pros start at 7:30 AM (S4); the elite leaders run from here. */
export const GUN = 450;

export type Wave = Readonly<{ start: number; name: string }>;
// Wave 1 starts at 7:35, after the pros at 7:30 and the High Performance Program at 7:32 (S4, S3).
export const WAVES: readonly Wave[] = [
  { start: 455, name: "Wave 1" },
  { start: 480, name: "Wave 2" },
  { start: 515, name: "Wave 3" },
];

/** The runner model's shape: when each wave starts, and the median finish time in
 *  minutes. v1 used waves at 450, 480 and 515 and a 270-minute (4:30) median; production
 *  uses Wave 1 at 7:35 and a median of about 4:20, the published average finish
 *  (S22, S18). The v1-parity tests pass v1's values explicitly. */
export type RunnerModel = Readonly<{ waveStarts: readonly [number, number, number]; medianFinish: number }>;
export const RUNNER_MODEL: RunnerModel = { waveStarts: [455, 480, 515], medianFinish: 260 };

export type LeaderId = "wcm" | "wcw" | "men" | "wom" | "wr" | "you";
export type Leader = Readonly<{
  id: LeaderId;
  name: string;
  sub: string;
  start: number; // minutes
  T: number; // finish time in minutes
  ghost: boolean; // a pace reference, not a real runner
  shownByDefault: boolean;
}>;

export const LEADERS: readonly Leader[] = [
  { id: "wcm", name: "Wheelchair men", sub: "about 1:25 pace", start: 440, T: 85, ghost: false, shownByDefault: true },
  { id: "wcw", name: "Wheelchair women", sub: "about 1:40 pace", start: 441, T: 100, ghost: false, shownByDefault: true },
  { id: "men", name: "Men's leader", sub: "about 2:02:30 pace", start: 450, T: 122.5, ghost: false, shownByDefault: true },
  { id: "wom", name: "Women's leader", sub: "about 2:15 pace", start: 450, T: 135, ghost: false, shownByDefault: true },
  { id: "wr", name: "World-record pace", sub: "Sawe's 1:59:30", start: 450, T: 119.5, ghost: true, shownByDefault: true },
  { id: "you", name: "Your pace", sub: "", start: 523, T: 270, ghost: true, shownByDefault: false },
];

export function leader(id: LeaderId): Leader {
  const found = LEADERS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown leader ${id}`);
  return found;
}
