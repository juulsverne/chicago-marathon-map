import { STREETS_CLOSE } from "@/content/race";
import { SEGMENTS, type Segment } from "./course";

export function isClosed(seg: Segment, t: number): boolean {
  return seg.finishArea || (t >= STREETS_CLOSE && t < (seg.reopensAt as number));
}

export function closedCount(t: number): number {
  let n = 0;
  for (const s of SEGMENTS) if (isClosed(s, t)) n++;
  return n;
}

/** The closed street (outside the finish area) that reopens soonest; ties go to race order. */
export function nextToReopen(t: number): Segment | null {
  let best: Segment | null = null;
  for (const s of SEGMENTS) {
    if (s.finishArea || !isClosed(s, t)) continue;
    if (!best || (s.reopensAt as number) < (best.reopensAt as number)) best = s;
  }
  return best;
}
