import type { ReactNode } from "react";
import { OPENING_TIME } from "@/content/race";
import { STREETS_COPY } from "@/content/streets";
import { isClosed } from "@/model/closures";
import type { Segment } from "@/model/course";
import { timelineFraction } from "../moments";
import { AREA_VIEWS } from "./street-view";
import { StreetRowBody } from "./StreetRowBody";

/** The 41 closures grouped by neighborhood in race order. `row` draws each
 *  street; the prerendered list passes plain rows, the live list buttons. Rows keep a
 *  scroll margin so scrolling one into view leaves it clear of its sticky group header. */
export function StreetGroups({ row, hidden }: { row: (seg: Segment) => ReactNode; hidden?: (seg: Segment) => boolean }) {
  return (
    <div className="space-y-4" data-testid="street-groups">
      {AREA_VIEWS.map((area) => {
        const shown = hidden ? area.segments.filter((s) => !hidden(s)) : area.segments;
        if (shown.length === 0) return null;
        return (
          <section key={area.name} aria-label={area.name}>
            {/* -top-4 cancels the panel scroller's pt-4: sticky offsets count from inside its
                padding, so top-0 left a 16 px strip where rows scrolled into view above it.
                v1's group head: the neighborhood in the display face over a heavy rule. On phones
                the reopening times stack under the name, so the head stays short in a half sheet. */}
            <div className="sticky -top-4 z-[1] -mx-4 bg-panel px-4 pt-2 md:pt-3">
              <div className="flex flex-col border-b-2 border-fg pb-1 md:flex-row md:items-end md:justify-between md:gap-3 md:pb-1.5">
                <div className="min-w-0">
                  <h4 className="font-display text-base font-bold uppercase leading-tight tracking-wide text-fg md:text-lg">{area.name}</h4>
                  <p className="font-mono text-[11px] text-soft">{area.summary}</p>
                </div>
                <p className="font-mono text-[11px] leading-4 text-muted md:shrink-0 md:text-right">
                  {area.reopens}
                  {area.finish && (
                    <>
                      <br />
                      {STREETS_COPY.list.areaFinish}
                    </>
                  )}
                </p>
              </div>
            </div>
            {/* Hairlines between the streets, as v1's. */}
            <ul className="divide-y divide-line">{shown.map((seg) => row(seg))}</ul>
          </section>
        );
      })}
    </div>
  );
}

/** The prerendered list: the 5:50 AM opening state, readable with JavaScript off. */
export function StaticStreetList() {
  return (
    <StreetGroups
      row={(seg) => (
        <li key={seg.slug} data-testid="street-row" data-slug={seg.slug} className="scroll-mt-16">
          <div className="block w-full rounded-lg px-2 py-2">
            <StreetRowBody seg={seg} closed={isClosed(seg, OPENING_TIME)} now={timelineFraction(OPENING_TIME)} />
          </div>
        </li>
      )}
    />
  );
}
