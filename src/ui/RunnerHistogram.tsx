import histogram from "@/data/histogram.json";
import { DAY_END, DAY_START } from "@/content/race";

// One SVG unit per minute of the timeline, so the area lines up with the scrubber.
const WIDTH = DAY_END - DAY_START;
const HEIGHT = 20;

/** Runners on the course across the day as a closed area path, one unit per minute. */
export function histogramPath(counts: readonly number[], step: number): string {
  const max = Math.max(1, ...counts);
  const points = counts.map((c, i) => `${i * step} ${(HEIGHT - (c / max) * (HEIGHT - 2)).toFixed(2)}`);
  return `M0 ${HEIGHT}L${points.join("L")}L${WIDTH} ${HEIGHT}Z`;
}

/** The runner histogram behind the timeline's scrubber. A server component: the
 *  counts are computed at build time (npm run build:data) and none ship as JavaScript.
 *  The area is drawn twice: grey for the whole day, and red up to the thumb, clipped
 *  by the scrubber's --p (globals.css, .histogram-played). */
export function RunnerHistogram() {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="h-full w-full" data-testid="runner-histogram">
      <defs>
        <path id="runner-histogram-area" d={histogramPath(histogram.counts, histogram.step)} />
      </defs>
      <use href="#runner-histogram-area" className="fill-fg/15" />
      <use href="#runner-histogram-area" className="histogram-played fill-closed/45" />
    </svg>
  );
}
