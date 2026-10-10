"use client";

import { MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { STREETS_COPY } from "@/content/streets";
import { SPRING } from "@/motion/tokens";
import { isClosed } from "@/model/closures";
import { SEGMENTS } from "@/model/course";
import { useClock } from "../clock-context";
import { timelineFraction } from "../moments";
import { selectSegment, selection } from "../selection";
import { useStore } from "../use-store";
import { StreetCellsView } from "./StreetCells";
import { StreetGroups } from "./StreetList";
import { StreetRowBody } from "./StreetRowBody";
import { matchesQuery } from "./street-view";

/** The course strip, live: blocks follow the clock and a tap selects that street. */
export function LiveStreetCells() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  const selected = useStore(selection)?.index ?? -1;
  return <StreetCellsView minute={minute} selected={selected} onPick={(i) => selectSegment(i, "list")} />;
}

/** Search and the 41 closures, live: state follows the clock at 10 Hz,
 *  search filters as you type, and a row selects its street. Each row's plate shares a
 *  layoutId with the street card's, so a picked row grows into the card. Its
 *  layoutDependency is the row's selection, so Motion measures a row only when that
 *  changes, not on every clock-driven render. */
export function LiveStreetList() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  const selected = useStore(selection)?.index ?? -1;
  const [query, setQuery] = useState("");
  const any = SEGMENTS.some((s) => matchesQuery(s, query));
  const now = timelineFraction(minute);
  const { list } = STREETS_COPY;
  return (
    <MotionConfig reducedMotion="user">
      <div data-street-search className="mt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={list.searchLabel}
          placeholder={list.searchPlaceholder}
          className="h-11 w-full rounded-lg bg-panel-2 px-3 text-sm text-fg ring-1 ring-line placeholder:text-soft"
        />
      </div>
      <div className="mt-3">
        {any ? (
          <StreetGroups
            hidden={(s) => !matchesQuery(s, query)}
            row={(seg) => (
              <li key={seg.slug} data-testid="street-row" data-slug={seg.slug} className="scroll-mt-16">
                <button
                  type="button"
                  aria-pressed={seg.index === selected}
                  onClick={() => selectSegment(seg.index, "list")}
                  className="pressable relative block w-full rounded-lg px-2 py-2 text-left hover:bg-panel-2"
                >
                  <motion.span
                    aria-hidden="true"
                    layoutId={`street-${seg.index}`}
                    layoutDependency={seg.index === selected}
                    transition={SPRING.ui}
                    className={`absolute inset-0 rounded-lg ${seg.index === selected ? "bg-panel-2 ring-1 ring-line" : ""}`}
                  />
                  <span className="relative block">
                    <StreetRowBody seg={seg} closed={isClosed(seg, minute)} now={now} />
                  </span>
                </button>
              </li>
            )}
          />
        ) : (
          <p role="status" className="rounded-lg bg-panel-2 px-3 py-4 text-sm text-muted" data-testid="no-match">
            {list.noMatch(query.trim())}
          </p>
        )}
      </div>
    </MotionConfig>
  );
}
