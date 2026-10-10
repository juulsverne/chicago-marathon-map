"use client";

import { useEffect, useRef } from "react";
import { LEADERS } from "@/content/race";
import { isClosed } from "@/model/closures";
import { ROUTE_LEN, SEGMENTS, pointAt, svgPoint } from "@/model/course";
import { useRaceClock } from "@/ui/clock-context";
import { leaderSettings, shownLeaders } from "@/ui/leader-settings";
import { clearSelection, selectSegment, selection } from "@/ui/selection";
import { useStage } from "./stage-context";

// The viewBox is about 3x larger than the screen, so these radii in user units read as roughly 4 to 5 px dots.
const LEADER_R = 16;

/** Keeps the server-rendered SVG course current without re-rendering React: each
 *  segment's closure state (written to the DOM when the minute changes) and the
 *  leaders (moved every frame). Unmounts once MapLibre has taken over, and comes
 *  back if the stage falls back to the SVG. */
export function CourseSvgState() {
  return useStage().svgLive ? <LiveState /> : null;
}

function LiveState() {
  const clock = useRaceClock();
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = group.current;
    const root = g?.ownerSVGElement;
    if (!g || !root) return;
    const segments = Array.from(root.querySelectorAll<SVGPathElement>(".course-seg"));
    const dots = Array.from(g.querySelectorAll<SVGCircleElement>(".leader"));
    let minute = Number.NaN;
    const update = () => {
      const { t } = clock.getSnapshot();
      if (Math.floor(t) !== minute) {
        minute = Math.floor(t);
        segments.forEach((el, i) => el.setAttribute("data-state", isClosed(SEGMENTS[i], minute) ? "closed" : "open"));
      }
      const shown = shownLeaders(leaderSettings.get());
      LEADERS.forEach((base, i) => {
        const el = dots[i];
        const l = shown.find((s) => s.id === base.id);
        if (!l) {
          el.setAttribute("visibility", "hidden");
          return;
        }
        const f = (t - l.start) / l.T;
        if (f <= 0 || f >= 1) {
          el.setAttribute("visibility", "hidden");
          return;
        }
        const [x, y] = svgPoint(pointAt(f * ROUTE_LEN));
        el.setAttribute("cx", x.toFixed(1));
        el.setAttribute("cy", y.toFixed(1));
        el.setAttribute("visibility", "visible");
      });
    };
    update();
    // The selected street glows on the SVG too (the "selected" flag the engine draws on the map).
    const showSelection = () => {
      const index = selection.get()?.index ?? -1;
      segments.forEach((el, i) => el.toggleAttribute("data-selected", i === index));
    };
    showSelection();
    const onClick = (e: MouseEvent) => {
      const i = segments.indexOf(e.target as SVGPathElement);
      if (i >= 0) selectSegment(i, "map");
      else clearSelection();
    };
    root.addEventListener("click", onClick);
    const unsubscribeSelection = selection.subscribe(showSelection);
    const unsubscribeLeaders = leaderSettings.subscribe(update);
    const unsubscribeClock = clock.subscribe(update);
    return () => {
      unsubscribeClock();
      unsubscribeSelection();
      unsubscribeLeaders();
      root.removeEventListener("click", onClick);
    };
  }, [clock]);

  return (
    <g ref={group}>
      {LEADERS.map((l) => (
        <circle key={l.id} r={LEADER_R} visibility="hidden" className="leader" data-leader={l.id} vectorEffect="non-scaling-stroke">
          <title>{l.name}</title>
        </circle>
      ))}
    </g>
  );
}
