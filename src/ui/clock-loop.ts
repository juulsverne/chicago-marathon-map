import type { RaceClock } from "@/model/clock";
import type { Flag } from "./flag";

/** Live follows the real clock, which the model reads to the second, so Live
 *  ticks once a second (just after each second turns) instead of every frame. */
export const LIVE_TICK_SLACK_MS = 5;

/** Drives the clock: requestAnimationFrame while a replay plays, one timer tick a
 *  second in Live (one timeout until 5:00 AM CT while Live waits for the day to
 *  start). Sleeps while paused, while the tab is hidden and while the map is off
 *  screen (`onScreen`). Wakes on the next state change. */
export function runClockLoop(clock: RaceClock, onScreen?: Pick<Flag, "get" | "subscribe">): () => void {
  let raf = 0;
  let wake: ReturnType<typeof setTimeout> | undefined;
  let last = 0;
  let stopped = false;

  const cancelFrame = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const cancelWake = () => {
    if (wake !== undefined) clearTimeout(wake);
    wake = undefined;
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    try {
      clock.advance(dt);
    } finally {
      // An error while advancing must not stop the loop.
      schedule();
    }
  };

  const liveTick = () => {
    wake = undefined;
    try {
      clock.advance(0);
    } finally {
      schedule();
    }
  };

  /** Brings the pending frame or timer in line with the clock's state. */
  const schedule = () => {
    if (stopped) return;
    const s = clock.getSnapshot();
    const visible = !document.hidden && (onScreen?.get() ?? true);
    if (visible && s.live) {
      cancelFrame();
      cancelWake();
      const waitMs = clock.liveWaitMs();
      wake = setTimeout(liveTick, waitMs > 0 ? waitMs : 1000 - (Date.now() % 1000) + LIVE_TICK_SLACK_MS);
      last = 0;
      return;
    }
    cancelWake();
    if (visible && s.playing) {
      if (!raf) raf = requestAnimationFrame(frame);
    } else {
      cancelFrame();
      last = 0;
    }
  };

  const onVisibility = () => {
    last = 0;
    schedule();
  };

  const unsubscribe = clock.subscribe(schedule);
  const unsubscribeOnScreen = onScreen?.subscribe(onVisibility);
  document.addEventListener("visibilitychange", onVisibility);
  schedule();

  return () => {
    stopped = true;
    cancelFrame();
    cancelWake();
    unsubscribe();
    unsubscribeOnScreen?.();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
