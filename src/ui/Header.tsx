"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { COPY } from "@/content/copy";
import { dateChip, dateMode } from "@/model/date-mode";
import { subscribeToDateChanges } from "./date-subscription";

/** `mapKey` is the map key's button and popover (src/ui/map-key/MapKey.tsx), a server
 *  component that rides in the date chip's row. */
export function Header({ mapKey }: { mapKey?: ReactNode }) {
  // The chip depends on today's date, so it renders only on the client. It is
  // re-read when the tab returns and once a minute, so a tab left open overnight
  // does not keep yesterday's chip.
  const chip = useSyncExternalStore(subscribeToDateChanges, () => dateChip(dateMode(new Date())), () => null);
  // The panels' copy switches to the past tense after race day; the chip changes with the date mode.
  useEffect(() => {
    if (chip === null) return;
    const main = document.querySelector("main");
    if (main) main.dataset.tense = dateMode(new Date()).kind === "after" ? "past" : "future";
  }, [chip]);
  return (
    <header className="h-full rounded-panel bg-panel/95 px-4 py-3 shadow-lg ring-1 ring-line" data-testid="header-card">
      {/* Phones keep the header to one line of title (v1 did the same); the date chip stays. */}
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted max-md:hidden">{COPY.eyebrow}</p>
      <h1 className="font-display text-lg font-bold uppercase leading-none tracking-wide sm:text-3xl">{COPY.title}</h1>
      {/* The chip renders after hydration; its row is reserved so nothing moves when it arrives. */}
      <div className="mt-2 flex h-6 items-center gap-2">
        {chip && (
          <p className="inline-block truncate rounded-full bg-panel-2 px-2.5 py-1 text-xs leading-4 text-muted" data-testid="date-chip">
            {chip}
          </p>
        )}
        {mapKey && <div className="ml-auto shrink-0">{mapKey}</div>}
      </div>
    </header>
  );
}
