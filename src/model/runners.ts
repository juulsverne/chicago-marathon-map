import { FIELD, MODEL_RUNNERS, RUNNER_MODEL, RUNNER_SEED, leader, type RunnerModel } from "@/content/race";
import type { SegmentSpan } from "@/lib/geo/route";
import { makeGauss, mulberry32 } from "./random";

export type Runner = Readonly<{ T: number; wave: 0 | 1 | 2; start: number; jit: number }>;

/** v1's field model with its two fact-checked parameters exposed: the wave start
 *  times and the median finish. Draw order matters for parity: every finish time
 *  first, then per runner its start offset, then its lane jitter. */
export function generateRunners(n: number = MODEL_RUNNERS, seed: number = RUNNER_SEED, model: RunnerModel = RUNNER_MODEL): Runner[] {
  const rng = mulberry32(seed);
  const gauss = makeGauss(rng);
  const finish: number[] = [];
  for (let i = 0; i < n; i++) finish.push(Math.min(388, Math.max(150, model.medianFinish * Math.exp(0.17 * gauss()))));
  finish.sort((a, b) => a - b);
  return finish.map((T, k) => {
    const r = k / n;
    const wave: 0 | 1 | 2 = r < 0.36 ? 0 : r < 0.7 ? 1 : 2;
    const lo = [0, 0.36, 0.7][wave];
    const hi = [0.36, 0.7, 1][wave];
    const start = model.waveStarts[wave] + ((r - lo) / (hi - lo)) * 16 + rng() * 2;
    const jit = rng() - 0.5;
    return { T, wave, start, jit };
  });
}

/** A count of modeled runners as people in the 55,000 field, rounded to hundreds
 *  like v1. Always computed from the full 5,300-runner model, whatever the quality tier draws. */
export function people(modelCount: number): number {
  return Math.round((modelCount * FIELD) / MODEL_RUNNERS / 100) * 100;
}

const US = new Intl.NumberFormat("en-US");
/** "55,000" in every browser locale (v1 used the viewer's locale and showed "53.000" in some). */
export function formatPeople(n: number): string {
  return US.format(n);
}

export function segmentIndexAt(segmentEnds: ArrayLike<number>, d: number): number {
  let lo = 0;
  let hi = segmentEnds.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segmentEnds[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type RunnerStats = { on: number; finished: number; waiting: number; active: Uint32Array };

export function runnerStats(
  runners: readonly Runner[],
  t: number,
  routeLen: number,
  segmentEnds: ArrayLike<number>,
): RunnerStats {
  const active = new Uint32Array(segmentEnds.length);
  let on = 0;
  let finished = 0;
  let waiting = 0;
  for (const r of runners) {
    const f = (t - r.start) / r.T;
    if (f <= 0) waiting++;
    else if (f >= 1) finished++;
    else {
      on++;
      active[segmentIndexAt(segmentEnds, f * routeLen)]++;
    }
  }
  return { on, finished, waiting, active };
}

/** Distance along the route for every runner, or -1 when not on the course. */
export function writeDistances(runners: readonly Runner[], t: number, routeLen: number, out: Float32Array): number {
  let on = 0;
  for (let k = 0; k < runners.length; k++) {
    const f = (t - runners[k].start) / runners[k].T;
    if (f <= 0 || f >= 1) out[k] = -1;
    else {
      out[k] = f * routeLen;
      on++;
    }
  }
  return on;
}

export type SegmentTimes = Readonly<{ first: number; lead: number; peak: number; last: number }>;

/** When the wheelchair leader, the men's leader, the median runner and the last
 *  runners (99.5th percentile) reach one point `d` metres along the route. */
export function arrivalTimes(runners: readonly Runner[], d: number, routeLen: number): SegmentTimes {
  const a = arrivalsAt(runners, d, routeLen);
  return { first: a.wheelchair, lead: a.lead, peak: a.median, last: a.last };
}

function arrivalsAt(runners: readonly Runner[], d: number, routeLen: number) {
  const f = d / routeLen;
  const arrivals = runners.map((r) => r.start + r.T * f).sort((x, y) => x - y);
  const n = runners.length;
  const wheelchair = leader("wcm");
  const men = leader("men");
  return {
    wheelchair: wheelchair.start + wheelchair.T * f,
    lead: men.start + men.T * f,
    median: arrivals[n >> 1],
    last: arrivals[Math.floor(n * 0.995)],
  };
}

/** When wheelchair racers, the elite field, the main pack and the last
 *  runners reach each segment. */
export function segmentTimes(runners: readonly Runner[], spans: readonly SegmentSpan[], routeLen: number): SegmentTimes[] {
  return spans.map((s) => {
    const a = arrivalsAt(runners, s.d0, routeLen);
    const b = arrivalsAt(runners, s.d1, routeLen);
    const m = arrivalsAt(runners, (s.d0 + s.d1) / 2, routeLen);
    return { first: a.wheelchair, lead: a.lead, peak: m.median, last: b.last };
  });
}
