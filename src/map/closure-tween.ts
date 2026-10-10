/** Animates each course segment's `closed` value between 0 (open) and 1 (closed).
 *  MapLibre does not animate feature-state changes through `*-transition`, so the
 *  engine steps this tween while a change is in flight and writes the values as
 *  feature-state; the style interpolates the color on the GPU. Pure: no MapLibre. */
export class ClosureTween {
  private readonly from: Float32Array;
  private readonly to: Float32Array;
  private readonly start: Float64Array;
  private readonly sent: Float32Array;

  constructor(
    readonly count: number,
    private readonly durationMs: number,
  ) {
    this.from = new Float32Array(count);
    this.to = new Float32Array(count).fill(Number.NaN);
    this.start = new Float64Array(count);
    this.sent = new Float32Array(count).fill(Number.NaN);
  }

  /** Points every segment at its target. Segments whose target changed start a
   *  tween from wherever they are now (or jump, when `animate` is false). Returns
   *  true when any target changed. */
  retarget(closed: (index: number) => boolean, now: number, animate = true, delay?: (index: number) => number): boolean {
    let changed = false;
    for (let i = 0; i < this.count; i++) {
      const target = closed(i) ? 1 : 0;
      if (target === this.to[i]) continue;
      const first = Number.isNaN(this.to[i]);
      this.from[i] = animate && !first ? this.valueAt(i, now) : target;
      this.to[i] = target;
      this.start[i] = now + (animate && delay ? delay(i) : 0);
      changed = true;
    }
    return changed;
  }

  /** Sends every value that moved since the last step to `apply`. Returns true
   *  while any segment is still animating. */
  step(now: number, apply: (index: number, value: number) => void): boolean {
    let animating = false;
    for (let i = 0; i < this.count; i++) {
      if (Number.isNaN(this.to[i])) continue;
      const value = this.valueAt(i, now);
      if (value !== this.to[i]) animating = true;
      if (value !== this.sent[i]) {
        this.sent[i] = value;
        apply(i, value);
      }
    }
    return animating;
  }

  /** Forgets what was sent, so the next step sends every value again (after the
   *  map loses its feature-state, for example on a WebGL context restore). */
  resend(): void {
    this.sent.fill(Number.NaN);
  }

  private valueAt(i: number, now: number): number {
    const from = this.from[i];
    const to = this.to[i];
    if (from === to || this.durationMs <= 0) return to;
    const p = Math.min(1, Math.max(0, (now - this.start[i]) / this.durationMs));
    if (p >= 1) return to;
    const eased = p * p * (3 - 2 * p);
    return Math.fround(from + (to - from) * eased);
  }
}
