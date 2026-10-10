import { DAY_END, DAY_START, OPENING_TIME, SKIM } from "@/content/race";
import { keyMomentFactor } from "./cinema";
import { dateMode } from "./date-mode";

export type Speed = 1 | 5 | 15; // race minutes per real second
export const SPEEDS: readonly Speed[] = [1, 5, 15];

/** The speed control cycles 1, 5, 15, then back to 1. */
export function nextSpeed(speed: Speed): Speed {
  return SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
}

export type ClockState = Readonly<{ t: number; playing: boolean; speed: Speed; live: boolean }>;

/** What the server renders. The client switches to `initialClock` after hydration. */
export const SERVER_CLOCK: ClockState = { t: OPENING_TIME, playing: false, speed: 5, live: false };

const clamp = (t: number) => Math.min(DAY_END, Math.max(DAY_START, t));

/** The clock's state once the page has hydrated. A shared link's moment (`shared`)
 *  opens paused there and wins over Live; Live stays one tap away. */
export function initialClock(now: Date, reducedMotion: boolean, shared: number | null = null): ClockState {
  if (shared !== null) return { t: clamp(shared), playing: false, speed: 5, live: false };
  const mode = dateMode(now);
  if (mode.kind === "raceday" && mode.liveByDefault) {
    return { t: clamp(mode.minutes), playing: true, speed: 5, live: true };
  }
  return { t: OPENING_TIME, playing: !reducedMotion, speed: 5, live: false };
}

/** The single source of race time. A plain external store: no React inside. */
export class RaceClock {
  private state: ClockState;
  private readonly listeners = new Set<() => void>();
  /** The opening sequence holds replay time at 5:50 until the course has drawn in. */
  private held = false;
  /** While the opening choreography runs, default-speed playback slows around key moments. */
  private cinematic = false;

  constructor(
    initial: ClockState = SERVER_CLOCK,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.state = initial;
  }

  getSnapshot = (): ClockState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  reset(next: ClockState): void {
    this.commit(next);
  }

  /** Holds replay time where it is (still reading as playing) until released. */
  hold(on: boolean): void {
    this.held = on;
  }

  /** Turns the key-moment slowdowns on or off (the opening choreography). */
  setCinematic(on: boolean): void {
    this.cinematic = on;
  }

  play(): void {
    const t = this.state.t >= DAY_END ? OPENING_TIME : this.state.t;
    this.commit({ ...this.state, t, playing: true, live: false });
  }

  pause(): void {
    this.commit({ ...this.state, playing: false, live: false });
  }

  toggle(): void {
    if (this.state.playing) this.pause();
    else this.play();
  }

  seek(t: number): void {
    this.commit({ ...this.state, t: clamp(t), live: false });
  }

  setSpeed(speed: Speed): void {
    this.commit({ ...this.state, speed, live: false });
  }

  setLive(on: boolean): void {
    if (!on) {
      this.commit({ ...this.state, live: false });
      return;
    }
    this.commit(this.liveAt(this.state, true));
  }

  /** Milliseconds until Live can next move the clock: until 5:00 AM CT while
   *  Live waits on race day for the timeline to start, 0 otherwise. */
  liveWaitMs(): number {
    if (!this.state.live) return 0;
    const mode = dateMode(this.now());
    if (mode.kind !== "raceday" || !mode.liveOffered || mode.minutes >= DAY_START) return 0;
    return Math.ceil((DAY_START - mode.minutes) * 60_000);
  }

  advance(dtSeconds: number): void {
    const s = this.state;
    if (s.live) {
      this.commit(this.liveAt(s, false));
      return;
    }
    if (!s.playing || dtSeconds <= 0 || this.held) return;
    const skim = s.speed === SKIM.atSpeed && s.t > SKIM.from && s.t < SKIM.to ? SKIM.factor : 1;
    const factor = skim * (this.cinematic && s.speed === SKIM.atSpeed ? keyMomentFactor(s.t) : 1);
    const t = s.t + s.speed * dtSeconds * factor;
    this.commit(t >= DAY_END ? { ...s, t: DAY_END, playing: false } : { ...s, t });
  }

  /** Live's state at the real Chicago date and time. Live exists only on race day,
   *  from 4:00 AM; the clock holds at the start until 5:00 AM. From 7:00 PM, and on
   *  any later day, it ends as a replay at the close. Before race day (or before
   *  4:00 AM on it) there is nothing to follow: entering Live changes nothing, and
   *  a running Live stops where it is. */
  private liveAt(s: ClockState, entering: boolean): ClockState {
    const mode = dateMode(this.now());
    if (mode.kind === "after" || (mode.kind === "raceday" && mode.minutes >= DAY_END)) {
      return { ...s, t: DAY_END, live: false, playing: false };
    }
    if (mode.kind === "before" || !mode.liveOffered) {
      return entering ? s : { ...s, live: false, playing: false };
    }
    return { ...s, live: true, playing: true, t: clamp(mode.minutes) };
  }

  private commit(next: ClockState): void {
    const s = this.state;
    if (next.t === s.t && next.playing === s.playing && next.speed === s.speed && next.live === s.live) return;
    this.state = next;
    // One failing listener (the map renderer, say) must not starve the others or
    // break the frame loop: report its error and carry on.
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        reportListenerError(error);
      }
    }
  }
}

function reportListenerError(error: unknown): void {
  if (typeof reportError === "function") reportError(error);
  else console.error(error);
}
