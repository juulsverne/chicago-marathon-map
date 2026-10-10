"use client";

import { COPY } from "@/content/copy";
import { STREETS_CLOSE } from "@/content/race";
import { closedCount, nextToReopen } from "@/model/closures";
import { SEGMENTS } from "@/model/course";
import { formatClock } from "@/model/time";
import { useClock } from "./clock-context";

/** The panel's summary: "41 of 41 closed · Next to reopen: Columbus Dr at 10:30 AM CT".
 *  One truncated line on phones (the sheet's peek line); on wider screens v1's
 *  big red count, then the next reopening with two lines reserved, so the panel keeps
 *  its height as the text changes. */
export function ClosureSummary() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  const next = nextToReopen(minute);
  const line = minute < STREETS_CLOSE ? COPY.beforeClose : next ? COPY.nextToReopen(next.street, formatClock(next.reopensAt as number)) : COPY.allReopened;
  return (
    <div className="flex min-w-0 items-baseline gap-1.5 md:block">
      <p
        className="shrink-0 font-display text-base font-bold uppercase leading-5 tracking-wide md:flex md:items-baseline md:gap-2 md:text-xl md:leading-none"
        data-testid="closed-count"
      >
        <span className="text-closed md:text-5xl md:leading-none">{closedCount(minute)}</span> {COPY.closedOf(SEGMENTS.length)}
      </p>
      <span aria-hidden="true" className="text-soft md:hidden">
        ·
      </span>
      <p className="min-w-0 truncate text-sm leading-5 text-muted md:mt-2 md:line-clamp-2 md:min-h-10 md:whitespace-normal" data-testid="next-reopen">
        {line}
      </p>
    </div>
  );
}
