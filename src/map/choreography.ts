import type { Map as MapLibreMap } from "maplibre-gl";
import type { DataDrivenPropertyValueSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { RaceClock } from "@/model/clock";
import { DRAW_IN_MS } from "@/model/cinema";
import { SEGMENTS } from "@/model/course";

type OpacityValue = DataDrivenPropertyValueSpecification<number>;

// The opening sequence, run once per page load in replay at the default
// speed with motion allowed. The camera never moves on its own (owner, 2026-10-09):
// the map opens on the whole course and stays there. With the clock held at 5:50 the
// course draws itself in along the route, then playback starts; the 6:00 closures
// ripple red (src/map/engine.ts) and playback slows around key moments (the clock's
// cinematic mode). Any user interaction cancels it for the session.

const COURSE_LAYERS = ["course-casing", "course-line"] as const;
const MILE_LAYER = "mile-labels";

export type ChoreographyOptions = Readonly<{
  map: MapLibreMap;
  clock: RaceClock;
}>;

export class Choreographer {
  private live = true;
  private frame = 0;

  constructor(private readonly o: ChoreographyOptions) {}

  /** Whether the opening is still running (until cancelled). */
  get active(): boolean {
    return this.live;
  }

  /** On map load: the draw-in, then playback. */
  start(): void {
    const { clock } = this.o;
    clock.hold(true);
    clock.setCinematic(true);
    this.setDrawn(0);
    const t0 = performance.now();
    const step = () => {
      this.frame = 0;
      if (!this.live) return;
      const p = Math.min(1, (performance.now() - t0) / DRAW_IN_MS);
      this.setDrawn(Math.round(p * SEGMENTS.length));
      if (p < 1) this.frame = requestAnimationFrame(step);
      else clock.hold(false); // draw-in done: playback starts at 5 sim-min/s
    };
    this.frame = requestAnimationFrame(step);
  }

  /** A user touched the map, the timeline, a street or a tab: stop for good.
   *  Playback carries on unless they paused it. */
  cancel(): void {
    if (!this.live) return;
    this.live = false;
    cancelAnimationFrame(this.frame);
    this.setDrawn(SEGMENTS.length);
    this.o.clock.hold(false);
    this.o.clock.setCinematic(false);
  }

  /** Shows the first `n` course segments (race order), and the mile markers they reach;
   *  all of them at the end. */
  private setDrawn(n: number): void {
    const all = n >= SEGMENTS.length;
    const value = (all ? 1 : ["case", ["<", ["id"], n], 1, 0]) as OpacityValue;
    for (const layer of COURSE_LAYERS) this.o.map.setPaintProperty(layer, "line-opacity", value);
    const reached = n > 0 ? SEGMENTS[n - 1].mi1 : 0;
    const miles = (all ? 1 : ["case", ["<=", ["get", "mile"], reached], 1, 0]) as OpacityValue;
    this.o.map.setPaintProperty(MILE_LAYER, "text-opacity", miles);
  }
}
