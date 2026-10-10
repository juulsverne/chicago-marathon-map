import { CARD_COPY } from "@/content/card";
import { closureSentence } from "@/model/closure-sentence";
import { AREAS } from "@/content/closures";
import { STREETS_CLOSE } from "@/content/race";
import type { Segment } from "@/model/course";
import { formatClock, formatDuration } from "@/model/time";

/** The card's status line at minute `t`:
 *  "Closed until ~10:30 AM CT · reopens in 55m". */
export function statusLine(seg: Segment, t: number): { closed: boolean; text: string } {
  if (seg.finishArea) return { closed: true, text: CARD_COPY.finishArea };
  const reopens = seg.reopensAt as number;
  if (t < STREETS_CLOSE) return { closed: false, text: CARD_COPY.openNow(formatDuration(STREETS_CLOSE - t)) };
  if (t >= reopens) return { closed: false, text: CARD_COPY.openAgain(formatClock(reopens)) };
  return { closed: true, text: CARD_COPY.closedUntil(formatClock(reopens), formatDuration(reopens - t)) };
}

/** v1's explanation, where it adds to the status line: while a street is closed (runners
 *  on the way, passing or gone), and while runners finish at the finish area. Open
 *  streets and the finish area's closure window would only repeat the status line. */
export function cardSentence(seg: Segment, t: number, runnersOnSegment: number): string | null {
  if (seg.finishArea) return runnersOnSegment > 0 ? closureSentence(seg, t, runnersOnSegment) : null;
  return statusLine(seg, t).closed ? closureSentence(seg, t, runnersOnSegment) : null;
}

/** "Grant Park & the Loop · miles 0.0–0.7" */
export function cardEyebrow(seg: Segment): string {
  return CARD_COPY.eyebrow(AREAS[seg.area].name, seg.mi0.toFixed(1), seg.mi1.toFixed(1));
}

/** The card's closure and runner times, v1's list. */
export function detailRows(seg: Segment): { label: string; value: string }[] {
  const closure = seg.finishArea
    ? [
        { label: CARD_COPY.closed, value: CARD_COPY.thursday },
        { label: CARD_COPY.reopens, value: CARD_COPY.monday },
      ]
    : [
        { label: CARD_COPY.closes, value: formatClock(STREETS_CLOSE) },
        { label: CARD_COPY.reopens, value: CARD_COPY.approx(formatClock(seg.reopensAt as number)) },
      ];
  return [
    ...closure,
    { label: CARD_COPY.wheelchair, value: CARD_COPY.approx(formatClock(seg.first)) },
    { label: CARD_COPY.elite, value: CARD_COPY.approx(formatClock(seg.lead)) },
    { label: CARD_COPY.crowd, value: CARD_COPY.approx(formatClock(seg.peak)) },
    { label: CARD_COPY.last, value: CARD_COPY.approx(formatClock(seg.last)) },
  ];
}
