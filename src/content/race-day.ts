import type { SourceId } from "./sources";
import type { Tensed } from "./tense";

// The Race tab. Fact-checked copy; modeled values say so.

/** The published average finish, about 4:20 (S22; 4:19:55 in 2024 per S18). */
export const AVERAGE_FINISH = 260;

/** The headline that follows the race clock (v1's story, corrected against the sources). */
export const STORY = {
  quiet: {
    head: "Quiet before the race",
    sub: "Course streets close at 6:00 AM CT. Runners start arriving in Grant Park around 5:30 AM CT.",
    sources: ["S1", "S4"] as readonly SourceId[],
  },
  closed: {
    head: "Streets are closed",
    sub: "All 41 course streets are closed to cars. Runners are filling the start corrals on Columbus Dr.",
    sources: ["S1", "S22"] as readonly SourceId[],
  },
  wheelchair: {
    head: "Wheelchair racers are off",
    sub: "Men started at 7:20, women at 7:21. The pros go at 7:30, Wave 1 at 7:35.",
    sources: ["S4", "S3"] as readonly SourceId[],
  },
  leading: (hood: string, mile: string) => `Men's leader near ${hood}, mile ${mile}`,
  waiting: (count: string) => `${count} runners are still waiting to start.`,
  wheelchairHome: "The wheelchair winner is already home.",
  onCourse: (count: string) => `${count} people are on the course.`,
  womenLeading: (mile: string) => `Men's winner is in. Women's leader at mile ${mile}`,
  stillOn: (count: string) => `${count} runners still on the course`,
  backOfPack: (hood: string, count: string) => `The back of the pack is near ${hood}. ${count} people have finished.`,
  finished: {
    head: "Everyone has finished",
    sub: (closed: number) => `${closed} streets are still closed until their scheduled reopening. The last, Roosevelt Rd, reopens at 6:00 PM CT.`,
    sources: ["S1"] as readonly SourceId[],
  },
  done: {
    head: "Race day is done",
    sub: "Every course street has reopened except Columbus Dr at the finish, which opens Monday at 3:00 PM CT.",
    sources: ["S1"] as readonly SourceId[],
  },
  at: (time: string) => `At ${time} CT`,
  live: "live",
} as const;

export const AGENDA_COPY = {
  title: "Race day at a glance",
  caption: "Tap any moment to jump the map there. Times are CT; times with ~ are modeled from typical paces.",
  next: "Next",
} as const;

export const STATS_COPY = {
  onCourse: "runners on the course",
  finished: "finished",
  waiting: "still in the start corrals",
  raceClock: "race clock, from the 7:30 gun",
  raceClockSources: { sources: ["S4"] as readonly SourceId[] },
} as const;

/** Bins of the per-mile histogram that get a place name under them (v1). */
export const HIST_PLACES: readonly { bin: number; name: string }[] = [
  { bin: 0, name: "Start" },
  { bin: 7, name: "Lakeview" },
  { bin: 13, name: "Loop" },
  { bin: 19, name: "Pilsen" },
  { bin: 24, name: "Bronzeville" },
];

export const FIELD_COPY = {
  title: "Where the 55,000 are",
  body: {
    future: "More than 55,000 runners from all 50 states and more than 130 countries are expected on the course in 2026. The model starts 55,000 runners in three waves.",
    past: "More than 55,000 runners from all 50 states and more than 130 countries were expected on the course in 2026. The model starts 55,000 runners in three waves.",
  } satisfies Tensed,
  sources: ["S6", "S3"] as readonly SourceId[],
  chartLabel: "Runners per mile",
  peak: (count: string) => `peak ${count} on one mile`,
  miles: [0, 5, 10, 15, 20, 25],
} as const;

export const BOARD_COPY = {
  title: "Front of the race",
  caption: "Modeled paces, not live tracking. Leaders are modeled on 2025's winning times: Kiplimo 2:02:23, Feysa 2:14:56, Hug 1:23:20, Scaroni 1:38:14.",
  sources: ["S11", "S17"] as readonly SourceId[],
  starts: (time: string) => `starts ${time}`,
  mile: (mile: string) => `mile ${mile}`,
  done: (time: string) => `done ${time}`,
  near: (hood: string) => ` · near ${hood}`,
  youSub: (wave: string, goal: string) => `${wave}, ${goal} goal`,
  zone: "Times CT",
} as const;

/** The toast after a jump to a key moment (v1's hint): "6:00 AM CT · Streets close. Course streets close at about 6:00 AM." */
export const JUMP_COPY = {
  toast: (at: string, name: string, detail: string) => `${at} CT · ${name}. ${detail}`,
} as const;

export const WAVES_COPY = {
  title: "Three start waves",
  caption: {
    future: "Runners start in waves so 55,000 people can fit through one start line.",
    past: "Runners started in waves so 55,000 people could fit through one start line.",
  } satisfies Tensed,
  rows: [
    { wave: "Wave 1", at: "7:35 AM", note: "right after the pros" },
    { wave: "Wave 2", at: "8:00 AM", note: "middle of the pack" },
    { wave: "Wave 3", at: "8:35 AM", note: "back of the pack" },
  ],
  zone: "Times CT",
  wheelchair: "Wheelchair racers go first at 7:20 (men) and 7:21 (women), then handcycles at 7:23.",
  sources: ["S4", "S3"] as readonly SourceId[],
} as const;

export const PACE_COPY = {
  title: "What that pace feels like",
  lead: "Sabastian Sawe's world record, 1:59:30 in London on April 26, 2026, averages:",
  stats: [
    { value: "13.2 mph", text: "average speed for two hours straight" },
    { value: "17.0 sec", text: "per 100 m, 422 times in a row" },
    { value: "34 sec", text: "per Chicago city block (1/8 mile)" },
  ],
  sources: ["S12", "S13", "S25"] as readonly SourceId[],
} as const;

export type LaneTone = "wr" | "men" | "wom" | "typical" | "you";
export type Lane = Readonly<{ name: string; sub: string; finish: number; tone: LaneTone; sources?: readonly SourceId[] }>;

/** "When Sawe finished, where was everyone?": finish times in minutes. */
export const LANES: readonly Lane[] = [
  { name: "Sabastian Sawe", sub: "World record", finish: 119.5, tone: "wr", sources: ["S12"] },
  { name: "Kelvin Kiptum", sub: "Chicago course record", finish: 120 + 35 / 60, tone: "wr", sources: ["S14"] },
  { name: "Jacob Kiplimo", sub: "Chicago 2025", finish: 122 + 23 / 60, tone: "men", sources: ["S17"] },
  { name: "Ruth Chepngetich", sub: "Women's record (mixed race)", finish: 129 + 56 / 60, tone: "wom", sources: ["S15"] },
  { name: "Hawi Feysa", sub: "Chicago 2025", finish: 134 + 56 / 60, tone: "wom", sources: ["S17"] },
  { name: "Typical runner", sub: "about 4:20 (average finish)", finish: AVERAGE_FINISH, tone: "typical", sources: ["S22", "S18"] },
  { name: "You", sub: "", finish: 270, tone: "you" },
];

export const LANES_COPY = {
  title: "When Sawe finished, where was everyone?",
  caption: "Each dot shows how far that runner gets in 1:59:30 at their own pace.",
  axis: ["Start", "13.1", "Finish"],
  miles: (mile: string) => `${mile} mi`,
  finish: (time: string) => `${time} finish`,
} as const;

export const CALCULATOR_COPY = {
  label: "Your marathon time",
  sentence: (pace: string, wave: string, mile: string, left: string) =>
    `That is ${pace} per mile, likely in ${wave}. When Sawe crossed the line you would be at mile ${mile}, with ${left} still to run.`,
  valueText: (time: string) => `${time} marathon`,
  showMine: "Show my pace on the map (pink dot)",
  showRecord: "Show world-record pace on the map (gold dot)",
} as const;
