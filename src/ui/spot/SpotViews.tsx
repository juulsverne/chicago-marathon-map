import type { ReactNode } from "react";
import { SPOT_COPY } from "@/content/spot";

export const SPOT_BUTTON =
  "pressable inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-line hover:bg-panel-2";
// v1's solid pink button. Pure white text on the pin's pink is 4.8:1 (the off-white fg is
// only 4.35:1, so this one button uses white).
export const SPOT_PRIMARY =
  "pressable inline-flex h-11 items-center justify-center gap-2 rounded-full bg-leader-you px-4 text-sm font-semibold text-white shadow-md hover:brightness-110";

/** The Check your spot card's frame: dashed while empty, pink once a pin is down (v1). */
export function SpotFrame({ pinned, children }: { pinned: boolean; children: ReactNode }) {
  return (
    <section
      aria-labelledby="spot-title"
      data-testid="spot"
      className={`rounded-panel p-4 ${pinned ? "bg-leader-you/5 ring-1 ring-leader-you" : "outline-[1.5px] outline-dashed outline-line"}`}
    >
      {children}
    </section>
  );
}

/** The empty card, prerendered: the live card (src/ui/spot/SpotCard.tsx) draws the same box. */
export function SpotStatic() {
  return (
    <SpotFrame pinned={false}>
      <h3 id="spot-title" className="font-display text-lg font-bold uppercase tracking-wide text-fg">
        {SPOT_COPY.title}
      </h3>
      <p className="mt-1 text-sm text-muted">{SPOT_COPY.intro}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={SPOT_PRIMARY}>
          {SPOT_COPY.drop}
        </button>
        <button type="button" className={SPOT_BUTTON}>
          {SPOT_COPY.locate}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{SPOT_COPY.private}</p>
    </SpotFrame>
  );
}
