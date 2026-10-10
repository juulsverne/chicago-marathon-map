import type { CSSProperties } from "react";
import { PANEL_COPY } from "@/content/panel-copy";
import { STREETS_COPY } from "@/content/streets";
import type { Segment } from "@/model/course";
import { ganttSpans, milesText, reopensText } from "./street-view";

const bar = ([from, to]: readonly [number, number]): CSSProperties => ({ left: `${from * 100}%`, width: `${Math.max(0, to - from) * 100}%` });

/** One closure in the street list: state, street, reopening time, range, miles, and its
 *  day on a small timeline (closed to cars, runners passing, now). Shared by the
 *  prerendered list and the live one, so both draw the same box. `now` is 0 to 1 along
 *  5:00 AM to 7:00 PM. The tick moves by transform on its own element: an inherited
 *  custom property on the list made every minute restyle and relayout all 41 rows,
 *  which cost phones a dropped frame per race minute (tests/perf). */
export function StreetRowBody({ seg, closed, now }: { seg: Segment; closed: boolean; now: number }) {
  const g = ganttSpans(seg);
  return (
    <>
      <span className="flex items-center gap-2">
        <i aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${closed ? "bg-closed" : "bg-open"}`} />
        <span className="sr-only">{closed ? PANEL_COPY.closedToCars : PANEL_COPY.openToCars}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{seg.street}</span>
        <span className="shrink-0 text-right leading-none">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted">{STREETS_COPY.list.reopens}</span>
          <b className="font-mono text-xs font-normal text-fg">{reopensText(seg)}</b>
        </span>
      </span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2 pl-4.5 text-xs text-muted">
        <span className="min-w-0 truncate">{seg.range}</span>
        <span className="shrink-0 font-mono text-[11px] text-muted">{milesText(seg)}</span>
      </span>
      <span aria-hidden="true" className="relative mt-1.5 ml-4.5 block h-1.5 overflow-hidden rounded-full bg-panel-2">
        <span className="absolute inset-y-0 bg-closed/30" style={bar(g.closed)} />
        <span className="absolute inset-y-0 bg-closed" style={bar(g.runners)} />
        <span className="absolute inset-0" style={{ transform: `translateX(${now * 100}%)` }}>
          <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-fg" />
        </span>
      </span>
    </>
  );
}
