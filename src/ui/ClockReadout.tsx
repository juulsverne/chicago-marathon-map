"use client";

import { COPY } from "@/content/copy";
import { formatClock } from "@/model/time";
import { useClock } from "./clock-context";
import { useInteraction } from "./interaction-loader";
import { MOMENTS, TONE_BG, currentMoment } from "./moments";

/** The clock card. It matches the header beside it: the same height (the row stretches
 *  both), the mono eyebrow, the time at the title's size and, from 768 px where the
 *  header shows its eyebrow, a chip row like the header's that names what is happening
 *  at the map time (v1's caption). Before 768 px the time sits on the chip row's line.
 *  From 768 px the card's width is fixed, so the header beside it never rewraps as the
 *  time and the chip change. */
export function ClockReadout() {
  const minute = useClock((s) => Math.floor(s.t));
  const live = useClock((s) => s.live);
  // Rolling digits only when the minute changes at most once a second: paused, Live, or 1 min/s.
  const calm = useClock((s) => !s.playing || s.live || s.speed === 1);
  const ui = useInteraction();
  const moment = currentMoment(minute);
  return (
    <div
      className="flex h-full flex-col justify-between rounded-panel bg-panel/95 px-4 py-3 text-right shadow-lg ring-1 ring-line md:w-40"
      data-testid="clock-card"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
        {live ? COPY.live : COPY.mapTime} · {COPY.timeZone}
      </p>
      {/* The plain time sets the box and stays readable to screen readers; once the interaction
          layer is in, the rolling digits are drawn over it in the same place, so nothing moves. */}
      <div className="relative font-display text-2xl font-bold leading-none sm:text-3xl">
        <p className={ui ? "opacity-0" : undefined} data-testid="clock">
          {formatClock(minute)}
        </p>
        {ui && (
          <span aria-hidden="true" className="absolute inset-0 flex items-baseline justify-end whitespace-nowrap">
            <ui.ClockDigits minute={minute} animated={calm} />
          </span>
        )}
      </div>
      {/* The chip may reach into the card's left padding: the card is right-aligned, so the
          longest label still reads as inset. It truncates if a fallback font runs wider. */}
      <div className="-ml-2 mt-2 hidden h-6 items-center justify-end md:flex">
        <p className="flex min-w-0 items-center gap-1.5 rounded-full bg-panel-2 px-2.5 py-1 text-xs leading-4 text-muted" data-testid="clock-phase">
          <i aria-hidden="true" className={`size-2 shrink-0 rounded-full ${moment < 0 ? "bg-open" : TONE_BG[MOMENTS[moment].dock.tone]}`} />
          <span className="truncate">{COPY.phases[moment + 1]}</span>
        </p>
      </div>
    </div>
  );
}
