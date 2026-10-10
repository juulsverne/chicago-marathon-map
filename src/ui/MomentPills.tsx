"use client";

import { COPY } from "@/content/copy";
import { useClock, useRaceClock } from "./clock-context";
import { showJump } from "./jump-toast";
import { MOMENTS, TONE_BG, currentMoment } from "./moments";

/** The five key-moment pills. A tap pauses and jumps the map to that moment. */
export function MomentPills() {
  const clock = useRaceClock();
  const current = useClock((s) => currentMoment(s.t), 10);
  return (
    <div role="group" aria-label={COPY.momentsLabel} className="scroll-fade-right -mx-1 flex items-center gap-2 overflow-x-auto py-0.5 pl-1 pr-6 [scrollbar-width:none]">
      <span aria-hidden="true" className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted">
        {COPY.momentsZone}
      </span>
      {MOMENTS.map((m, i) => (
        <button
          key={m.t}
          type="button"
          aria-label={COPY.momentLabel(m)}
          data-state={i === current ? "current" : i < current ? "past" : "future"}
          onClick={() => {
            clock.pause();
            clock.seek(m.t);
            showJump(m.t); // the interaction layer's toast names the moment (v1)
          }}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs ring-1 ring-line pressable hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open data-[state=current]:ring-2 data-[state=current]:ring-fg data-[state=past]:text-soft"
        >
          <i aria-hidden="true" className={`size-2 rounded-full ${TONE_BG[m.dock.tone]}`} />
          <b className="font-mono font-semibold">{m.dock.short}</b>{" "}
          <span>{m.dock.label}</span>
        </button>
      ))}
    </div>
  );
}
