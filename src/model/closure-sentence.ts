import { STREETS_CLOSE } from "@/content/race";
import type { Segment } from "./course";
import { formatClock, formatDuration } from "./time";

// v1's per-street explanation for a moment in the day, corrected against the sources:
// streets reopen as the final runners pass at a 15-minute-mile pace, on Chicago
// Police's call (source S2), not after crews clear them; a time that stands alone
// carries "CT". Only the street card (lazy) uses it.

export function closureSentence(seg: Segment, t: number, runnersOnSegment: number): string {
  if (seg.finishArea) {
    return runnersOnSegment > 0 ? "Runners are finishing right now." : "Closed from Thursday 6:00 AM until Monday 3:00 PM CT for the finish area.";
  }
  if (t < STREETS_CLOSE) return `Open now. Closes at 6:00 AM CT, ${formatDuration(STREETS_CLOSE - t)} from now.`;
  const reopens = seg.reopensAt as number;
  if (t >= reopens) return `Open again. It reopened at ${formatClock(reopens)} CT.`;
  if (runnersOnSegment > 0 || (t >= seg.first && t <= seg.last)) {
    return `The race is passing through right now. Reopens at ${formatClock(reopens)} CT.`;
  }
  if (t < seg.first) {
    return `Runners have not arrived yet. Wheelchair racers come through around ${formatClock(seg.first)} CT, the elite field around ${formatClock(seg.lead)} CT.`;
  }
  return `The main field has passed. It reopens at ${formatClock(reopens)} CT, in ${formatDuration(reopens - t)}, after the final runners at a 15-minute-mile pace.`;
}
