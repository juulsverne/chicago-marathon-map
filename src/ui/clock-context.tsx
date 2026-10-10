"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { RaceClock, SERVER_CLOCK, initialClock, type ClockState } from "@/model/clock";
import { readShareLink } from "@/model/share-link";
import { cancelChoreography } from "./choreography";
import { runClockLoop } from "./clock-loop";
import { Flag } from "./flag";
import { throttleSubscribe } from "./throttle";

const ClockContext = createContext<RaceClock | null>(null);
const MapOnScreenContext = createContext<Flag | null>(null);

export function ClockProvider({ children }: { children: ReactNode }) {
  const [clock] = useState(() => new RaceClock(SERVER_CLOCK));
  const [mapOnScreen] = useState(() => new Flag(true));

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A shared link is read here, after hydration, so the page still
    // prerenders as one static file. Its moment skips the opening choreography; its
    // street is selected when the interaction layer arrives (src/ui/share/SharedStreet.tsx).
    const shared = readShareLink(window.location.search).t;
    if (shared !== null) cancelChoreography();
    clock.reset(initialClock(new Date(), reducedMotion, shared));
    return runClockLoop(clock, mapOnScreen);
  }, [clock, mapOnScreen]);

  return (
    <ClockContext.Provider value={clock}>
      <MapOnScreenContext.Provider value={mapOnScreen}>{children}</MapOnScreenContext.Provider>
    </ClockContext.Provider>
  );
}

export function useRaceClock(): RaceClock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("useRaceClock must be used inside <ClockProvider>");
  return clock;
}

/** Whether the map is on screen. The map stage sets it; the frame loop sleeps while it is false. */
export function useMapOnScreen(): Flag {
  const flag = useContext(MapOnScreenContext);
  if (!flag) throw new Error("useMapOnScreen must be used inside <ClockProvider>");
  return flag;
}

/** Subscribe to one primitive derived from the clock. `hz` caps re-renders;
 *  omit it to re-render on every change. Selectors must return primitives. */
export function useClock<T extends string | number | boolean>(select: (s: ClockState) => T, hz?: number): T {
  const clock = useRaceClock();
  const subscribe = useMemo(() => (hz ? throttleSubscribe(clock.subscribe, hz) : clock.subscribe), [clock, hz]);
  return useSyncExternalStore(
    subscribe,
    () => select(clock.getSnapshot()),
    () => select(SERVER_CLOCK),
  );
}
