import { AREAS } from "@/content/closures";
import { DAY_END, DAY_START, STREETS_CLOSE } from "@/content/race";
import { STREETS_COPY } from "@/content/streets";
import { SEGMENTS, type Segment } from "@/model/course";
import { formatClock } from "@/model/time";

// What the street list and the street card show for a closure, kept pure so the
// server-rendered list and the live one draw exactly the same thing.

const frac = (t: number) => Math.min(1, Math.max(0, (t - DAY_START) / (DAY_END - DAY_START)));

/** A street's bars on the 5:00 AM to 7:00 PM timeline, as fractions: when it is closed
 *  to cars, and when runners are on it (wheelchair leaders to the last runners). The
 *  finish area is closed the whole day. */
export function ganttSpans(seg: Segment): { closed: readonly [number, number]; runners: readonly [number, number] } {
  const closed: readonly [number, number] = seg.finishArea ? [0, 1] : [frac(STREETS_CLOSE), frac(seg.reopensAt as number)];
  return { closed, runners: [frac(seg.first), frac(seg.last)] };
}

/** "10:30 AM", or "Mon 3:00 PM" for the finish area. */
export function reopensText(seg: Segment): string {
  return seg.finishArea ? STREETS_COPY.list.reopensFinish : formatClock(seg.reopensAt as number);
}

/** "mi 0.0–0.7" */
export function milesText(seg: Segment): string {
  return STREETS_COPY.list.miles(seg.mi0.toFixed(1), seg.mi1.toFixed(1));
}

/** "10:30–11:30 AM", "11:30 AM–1:15 PM", or one time when both are equal. */
export function formatClockRange(from: number, to: number): string {
  const a = formatClock(from);
  const b = formatClock(to);
  if (a === b) return a;
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

export type AreaView = Readonly<{
  name: string;
  segments: readonly Segment[];
  summary: string;
  reopens: string;
  finish: boolean;
}>;

/** The six neighborhood groups in race order, with v1's summaries. */
export const AREA_VIEWS: readonly AreaView[] = AREAS.map((area) => {
  const segments = SEGMENTS.slice(area.first, area.last + 1);
  const timed = segments.filter((s) => !s.finishArea).map((s) => s.reopensAt as number);
  return {
    name: area.name,
    segments,
    summary: STREETS_COPY.list.area(segments[0].mi0.toFixed(1), segments[segments.length - 1].mi1.toFixed(1), segments.length),
    reopens: STREETS_COPY.list.areaReopens(formatClockRange(Math.min(...timed), Math.max(...timed))),
    finish: segments.some((s) => s.finishArea),
  };
});

/** Case-insensitive search over "street range", as v1 did: "halsted" finds the Halsted St
 *  rows and the rows whose range mentions Halsted St. */
export function matchesQuery(seg: Segment, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || `${seg.street} ${seg.range}`.toLowerCase().includes(q);
}
