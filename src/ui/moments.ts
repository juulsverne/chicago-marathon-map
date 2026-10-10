import { DOCK_EVENTS, type DockEvent } from "@/content/dock-events";
import { DAY_END, DAY_START } from "@/content/race";

/** The five key moments on the timeline (the events with a dock label), in time order. */
export const MOMENTS: readonly DockEvent[] = DOCK_EVENTS;

/** Background class per moment tone (tokens in globals.css). */
export const TONE_BG: Readonly<Record<DockEvent["dock"]["tone"], string>> = {
  close: "bg-moment-close",
  start: "bg-moment-start",
  first: "bg-moment-first",
  last: "bg-moment-last",
  open: "bg-moment-open",
};

/** Where minute `t` sits along the timeline, 0 to 1. */
export function timelineFraction(t: number): number {
  return Math.min(1, Math.max(0, (t - DAY_START) / (DAY_END - DAY_START)));
}

/** Index of the last moment at or before `t`, or -1 before the first. */
export function currentMoment(t: number): number {
  let current = -1;
  MOMENTS.forEach((m, i) => {
    if (m.t <= t) current = i;
  });
  return current;
}
