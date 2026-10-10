import { lowerTier, type Tier } from "./tiers";

// The frame-time governor. Pure: it is fed frame timestamps in ms.

export const GOVERNOR = {
  /** No step down in the first 3 s after the map is ready. */
  warmupMs: 3000,
  /** Rolling window of frame intervals. */
  windowMs: 2000,
  /** A frame is a stutter when it takes over 1.5x the window's median. */
  stutterFactor: 1.5,
  /** Step down when more than 10% of the window's frames stutter... */
  maxStutterShare: 0.1,
  /** ...or when the median frame takes over 40 ms. */
  maxMedianMs: 40,
  /** The one promotion, Medium to High, judged on the first 5 s. */
  promotionMs: 5000,
  promotionMedianMs: 17.5,
  promotionStutterShare: 0.02,
  /** Fewer frames than this in the first 5 s is too little evidence to promote. */
  promotionMinFrames: 60,
  /** Gaps longer than this are pauses, not frames. */
  maxGapMs: 1000,
  /** Judge the window at most this often. */
  evaluateEveryMs: 250,
} as const;

function median(sorted: readonly number[]): number {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) >> 1] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/** Median interval and stutter share of a set of frame intervals. */
export function frameStats(intervals: readonly number[]): { median: number; stutter: number } {
  if (intervals.length === 0) return { median: 0, stutter: 0 };
  const m = median([...intervals].sort((a, b) => a - b));
  let slow = 0;
  for (const d of intervals) if (d > GOVERNOR.stutterFactor * m) slow++;
  return { median: m, stutter: slow / intervals.length };
}

/** Steps the quality tier down when frames stutter or run slow. Never steps up,
 *  except one earned promotion from Medium to High in the first 5 s. A steady
 *  33 ms median with low variance (iOS Low Power Mode) is healthy and stays. */
export class FrameGovernor {
  private current: Tier;
  private readonly startedMedium: boolean;
  private last = Number.NaN;
  private paused = false;
  private window: { at: number; d: number }[] = [];
  private windowStart = Number.NaN;
  private lastEvaluation = Number.NEGATIVE_INFINITY;
  private readonly firstFrames: number[] = [];
  private promotionDecided = false;

  constructor(
    start: Tier,
    private readonly readyAt: number,
  ) {
    this.current = start;
    this.startedMedium = start === "medium";
  }

  get tier(): Tier {
    return this.current;
  }

  /** Stops measuring (camera moves, tab switches, paused playback). */
  pause(): void {
    this.paused = true;
    this.last = Number.NaN;
  }

  /** Measures again from the next frame, with a fresh window. */
  resume(): void {
    this.paused = false;
    this.last = Number.NaN;
    this.window = [];
    this.windowStart = Number.NaN;
  }

  /** Records a frame at `now` (ms). Returns the new tier when it changes. */
  frame(now: number): Tier | null {
    if (this.paused) return null;
    const previous = this.last;
    this.last = now;
    if (Number.isNaN(previous)) return null;
    const d = now - previous;
    if (d <= 0 || d > GOVERNOR.maxGapMs) return null;

    if (now <= this.readyAt + GOVERNOR.promotionMs) this.firstFrames.push(d);
    if (Number.isNaN(this.windowStart)) this.windowStart = previous;
    this.window.push({ at: now, d });
    while (this.window.length > 0 && this.window[0].at <= now - GOVERNOR.windowMs) this.window.shift();

    const promoted = this.promote(now);
    if (promoted) return promoted;

    if (now < this.readyAt + GOVERNOR.warmupMs) return null;
    if (now - this.windowStart < GOVERNOR.windowMs) return null;
    if (now - this.lastEvaluation < GOVERNOR.evaluateEveryMs) return null;
    this.lastEvaluation = now;
    if (this.current === "low") return null;

    const { median: m, stutter } = frameStats(this.window.map((f) => f.d));
    if (stutter <= GOVERNOR.maxStutterShare && m <= GOVERNOR.maxMedianMs) return null;
    this.current = lowerTier(this.current);
    this.promotionDecided = true;
    this.window = [];
    this.windowStart = now;
    return this.current;
  }

  private promote(now: number): Tier | null {
    if (this.promotionDecided || !this.startedMedium) return null;
    if (now < this.readyAt + GOVERNOR.promotionMs) return null;
    this.promotionDecided = true;
    if (this.current !== "medium" || this.firstFrames.length < GOVERNOR.promotionMinFrames) return null;
    const { median: m, stutter } = frameStats(this.firstFrames);
    if (m > GOVERNOR.promotionMedianMs || stutter >= GOVERNOR.promotionStutterShare) return null;
    this.current = "high";
    this.window = [];
    this.windowStart = now;
    return this.current;
  }
}
