// Race-day moments, as written in v1, corrected against the sources: the agenda. "~"
// marks modeled times, and each detail names its sources (src/content/sources.ts). The
// five that sit on the timeline dock come from dock-events.ts, which keeps the dock's
// first-load JavaScript free of this list's descriptions.
import { DOCK_EVENTS, type DockEvent } from "./dock-events";
import type { SourceId } from "./sources";

export { DOCK_EVENTS, type DockEvent };

export type RaceEvent = Readonly<{
  t: number;
  at: string;
  name: string;
  detail: string;
  sources: readonly SourceId[];
  kind: "close" | "race" | "open";
  dock?: DockEvent["dock"];
}>;

/** A dock event, by its time, with the description, sources and kind the agenda adds. */
function onDock(t: number, extra: Pick<RaceEvent, "detail" | "sources" | "kind">): RaceEvent {
  const event = DOCK_EVENTS.find((e) => e.t === t);
  if (!event) throw new Error(`No dock event at ${t}`);
  return { ...event, ...extra };
}

export const EVENTS: readonly RaceEvent[] = [
  onDock(360, {
    detail: "Course streets close at about 6:00 AM. Columbus Dr from Roosevelt Rd to the finish has been closed since Thursday at 6:00 AM.",
    sources: ["S1", "S2"],
    kind: "close",
  }),
  { t: 440, at: "7:20 AM", name: "Wheelchair racers start", detail: "Men at 7:20, women at 7:21, handcycles at 7:23.", sources: ["S4"], kind: "race" },
  onDock(450, {
    detail: "The pros leave Grant Park; the High Performance Program follows at 7:32 and Wave 1 at 7:35. Wave 2 goes at 8:00, Wave 3 at 8:35.",
    sources: ["S4", "S3"],
    kind: "race",
  }),
  {
    t: 525,
    at: "~8:45 AM",
    name: "First wheelchair finisher",
    detail: "Modeled: about 1 hour 25 minutes after their 7:20 start (Marcel Hug won in 1:23:20 in 2025).",
    sources: ["S4", "S11"],
    kind: "race",
  },
  onDock(572, {
    detail: "Modeled: the men's winner crosses the line about 2 hours after the 7:30 start (Jacob Kiplimo won in 2:02:23 in 2025).",
    sources: ["S4", "S17"],
    kind: "race",
  }),
  {
    t: 585,
    at: "~9:45 AM",
    name: "Women's winner finishes",
    detail: "Modeled: about 2 hours 15 minutes after the start (Hawi Feysa won in 2:14:56 in 2025).",
    sources: ["S17"],
    kind: "race",
  },
  { t: 630, at: "10:30 AM", name: "First streets reopen", detail: "Columbus Dr and Grand Ave, near the start.", sources: ["S1"], kind: "open" },
  onDock(920, {
    detail: "Runners get 6.5 hours from their start for an official time (15 minutes a mile), so Wave 3 wraps up mid-afternoon. The course closes around 4 PM.",
    sources: ["S5", "S22"],
    kind: "race",
  }),
  onDock(1080, {
    detail: "Roosevelt Rd, the final climb. Columbus Dr at the finish stays closed until Monday 3:00 PM.",
    sources: ["S1", "S22"],
    kind: "open",
  }),
];
