import type { CourseState } from "./style";

/** The per-segment flags the UI sets: a click selects, a pointer hovers. */
export type SegmentFlag = "selected" | "hover";

/** Writes one segment's feature-state to the map (a merge: keys not given are kept). */
export type WriteCourseState = (id: number, state: CourseState) => void;

/** The engine's own copy of every course segment's state: `closed` (the tweened 0..1
 *  value), `selected` and `hover`. MapLibre keeps feature-state only inside a style, and
 *  its style is gone from a WebGL context loss until the rebuilt one has loaded, when
 *  `setFeatureState` throws. So nothing is written to the map unless the style is
 *  ready, and the whole stored state is written back the moment it becomes ready
 *  again. Pure: no MapLibre. */
export class CourseStateStore {
  private readonly closed: Float32Array;
  private readonly selected: Uint8Array;
  private readonly hover: Uint8Array;
  private isReady = false;

  constructor(
    readonly count: number,
    private readonly write: WriteCourseState,
  ) {
    this.closed = new Float32Array(count).fill(Number.NaN);
    this.selected = new Uint8Array(count);
    this.hover = new Uint8Array(count);
  }

  get ready(): boolean {
    return this.isReady;
  }

  /** Whether MapLibre's style can take feature-state. Becoming ready writes everything stored. */
  setReady(ready: boolean): void {
    const was = this.isReady;
    this.isReady = ready;
    if (ready && !was) this.flush();
  }

  /** The tweened `closed` value (0 open .. 1 closed). */
  setClosed(id: number, closed: number): void {
    this.check(id);
    this.closed[id] = closed;
    if (this.isReady) this.write(id, { closed });
  }

  /** Sets one flag on one segment. Exclusivity ("only one segment selected") is the caller's. */
  setFlag(id: number, flag: SegmentFlag, on: boolean): void {
    this.check(id);
    const flags = flag === "selected" ? this.selected : this.hover;
    const value = on ? 1 : 0;
    if (flags[id] === value) return;
    flags[id] = value;
    if (this.isReady) this.write(id, { [flag]: on });
  }

  /** Writes every segment's full stored state, if the style is ready. */
  flush(): void {
    if (!this.isReady) return;
    for (let id = 0; id < this.count; id++) {
      const state: CourseState = { selected: this.selected[id] === 1, hover: this.hover[id] === 1 };
      if (!Number.isNaN(this.closed[id])) state.closed = this.closed[id];
      this.write(id, state);
    }
  }

  private check(id: number): void {
    if (!Number.isInteger(id) || id < 0 || id >= this.count) throw new RangeError(`No course segment ${id}`);
  }
}
