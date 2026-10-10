// The opening sequence's timing. Pure: the map engine's choreographer and
// the race clock read these. The camera has no part in it (owner, 2026-10-09).

/** Draw-in of the course, then playback starts. */
export const DRAW_IN_MS = 2000;
/** The 6:00 closures ripple red in race order over this long. */
export const RIPPLE_MS = 1200;

/** First finisher (~9:32 AM) and first reopening (10:30 AM). */
export const KEY_MOMENTS = [572, 630] as const;
const SLOW = 2 / 5; // 2 sim-min/s at the default 5
const HALF_WINDOW = 1.5; // 3 sim-min around each moment
const EASE = 1.5; // sim-min to ease in and out

/** The speed factor at race minute `t` during auto-play at default speed: 0.4 within
 *  1.5 sim-min of a key moment, easing back to 1 over the next 1.5 sim-min. */
export function keyMomentFactor(t: number): number {
  let factor = 1;
  for (const m of KEY_MOMENTS) {
    const d = Math.abs(t - m);
    if (d <= HALF_WINDOW) return SLOW;
    if (d < HALF_WINDOW + EASE) {
      const x = (d - HALF_WINDOW) / EASE;
      factor = Math.min(factor, SLOW + (1 - SLOW) * x * x * (3 - 2 * x));
    }
  }
  return factor;
}

/** When segment `i` (race order) turns red in the 6:00 ripple, in ms after it starts. */
export function rippleDelay(i: number, count = 41): number {
  return (i / (count - 1)) * RIPPLE_MS;
}
