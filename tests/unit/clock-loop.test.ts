import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_START } from "@/content/race";
import { RaceClock, SERVER_CLOCK } from "@/model/clock";
import { LIVE_TICK_SLACK_MS, runClockLoop } from "@/ui/clock-loop";
import { Flag } from "@/ui/flag";

type Frame = (time: number) => void;

let frames: Map<number, Frame>;
let listeners: Map<string, Set<() => void>>;
let doc: {
  hidden: boolean;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const pendingFrames = () => frames.size;

/** Runs the oldest pending frame at the given timestamp. False when none is pending. */
function flushFrame(time: number): boolean {
  const next = frames.entries().next();
  if (next.done) return false;
  const [id, callback] = next.value;
  frames.delete(id);
  callback(time);
  return true;
}

/** Runs frames 100 ms apart until none is pending, up to `max` frames. */
function runFrames(max: number) {
  let time = 1000;
  for (let i = 0; i < max && flushFrame(time); i++) time += 100;
}

function dispatch(type: string) {
  for (const fn of listeners.get(type) ?? []) fn();
}

beforeEach(() => {
  frames = new Map();
  listeners = new Map();
  let nextId = 1;
  // The frame stub is ours. Fake timers below must leave requestAnimationFrame alone,
  // or sinon replaces it and its frames show up as timers.
  vi.stubGlobal("requestAnimationFrame", (callback: Frame) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
  doc = {
    hidden: false,
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
  };
  vi.stubGlobal("document", doc);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("runClockLoop", () => {
  it("playing schedules exactly one pending frame", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock);
    expect(pendingFrames()).toBe(1);
    dispose();
  });

  it("pausing cancels the pending frame and the loop stays asleep", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock);
    flushFrame(1000);
    expect(pendingFrames()).toBe(1);
    clock.pause();
    expect(pendingFrames()).toBe(0);
    expect(flushFrame(1100)).toBe(false);
    dispose();
  });

  it("play() wakes a paused loop", () => {
    const clock = new RaceClock(SERVER_CLOCK);
    const dispose = runClockLoop(clock);
    expect(pendingFrames()).toBe(0);
    clock.play();
    expect(pendingFrames()).toBe(1);
    dispose();
  });

  it("a hidden tab sleeps, and a visible one wakes it", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock);
    doc.hidden = true;
    dispatch("visibilitychange");
    expect(pendingFrames()).toBe(0);
    doc.hidden = false;
    dispatch("visibilitychange");
    expect(pendingFrames()).toBe(1);
    dispose();
  });

  it("a replay that reaches 7:00 PM ends with no frame pending", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, t: 1130, playing: true, speed: 15 });
    const dispose = runClockLoop(clock);
    runFrames(100);
    expect(clock.getSnapshot()).toMatchObject({ t: 1140, playing: false });
    expect(pendingFrames()).toBe(0);
    dispose();
  });

  it("Live before 5:00 AM schedules no frame and one timeout that wakes at 5:00 AM", () => {
    vi.useFakeTimers({ now: new Date("2026-10-11T09:30:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] }); // 4:30 AM CDT
    const clock = new RaceClock({ ...SERVER_CLOCK, t: DAY_START, playing: true, live: true });
    const dispose = runClockLoop(clock);
    expect(pendingFrames()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(30 * 60_000 - 1);
    expect(pendingFrames()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(1);
    // From 5:00 AM Live ticks once a second on a timer, never by animation frame.
    expect(vi.getTimerCount()).toBe(1);
    expect(pendingFrames()).toBe(0);
    dispose();
  });

  it("ticks Live once a second, just after each second turns, with no animation frames", () => {
    vi.useFakeTimers({ now: new Date("2026-10-11T14:00:00.300Z"), toFake: ["setTimeout", "clearTimeout", "Date"] }); // 9:00:00.3 AM CDT
    const clock = new RaceClock({ ...SERVER_CLOCK, t: 540, playing: true, live: true });
    const dispose = runClockLoop(clock);
    expect(pendingFrames()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(700 + LIVE_TICK_SLACK_MS - 1);
    expect(clock.getSnapshot().t).toBe(540);
    vi.advanceTimersByTime(1);
    expect(clock.getSnapshot().t).toBeCloseTo(540 + 1 / 60, 9);

    vi.advanceTimersByTime(1000);
    expect(clock.getSnapshot().t).toBeCloseTo(540 + 2 / 60, 9);
    expect(vi.getTimerCount()).toBe(1);
    expect(pendingFrames()).toBe(0);
    dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("an off-screen map sleeps, and coming back on screen wakes it", () => {
    const onScreen = new Flag(true);
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock, onScreen);
    expect(pendingFrames()).toBe(1);
    onScreen.set(false);
    expect(pendingFrames()).toBe(0);
    clock.seek(500);
    expect(pendingFrames()).toBe(0);
    onScreen.set(true);
    expect(pendingFrames()).toBe(1);
    dispose();
  });

  it("keeps running after an error while advancing", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock);
    vi.spyOn(clock, "advance").mockImplementationOnce(() => {
      throw new Error("advance failed");
    });
    expect(() => flushFrame(1000)).toThrow("advance failed");
    expect(pendingFrames()).toBe(1);
    flushFrame(1100);
    expect(clock.getSnapshot().t).toBeGreaterThan(SERVER_CLOCK.t);
    dispose();
  });

  it("pausing or seeking while Live waits for 5:00 AM cancels the wake-up timer", () => {
    vi.useFakeTimers({ now: new Date("2026-10-11T09:30:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] }); // 4:30 AM CDT
    const waiting = { ...SERVER_CLOCK, t: DAY_START, playing: true, live: true };

    const paused = new RaceClock(waiting);
    const disposePaused = runClockLoop(paused);
    expect(vi.getTimerCount()).toBe(1);
    paused.pause();
    expect(vi.getTimerCount()).toBe(0);
    expect(pendingFrames()).toBe(0);
    disposePaused();

    const seeked = new RaceClock(waiting);
    const disposeSeeked = runClockLoop(seeked);
    expect(vi.getTimerCount()).toBe(1);
    seeked.seek(600);
    expect(vi.getTimerCount()).toBe(0);
    disposeSeeked();
  });

  it("repeated notifications while Live waits leave exactly one wake-up timer", () => {
    vi.useFakeTimers({ now: new Date("2026-10-11T09:30:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
    const waiting = { ...SERVER_CLOCK, t: DAY_START, playing: true, live: true };
    const clock = new RaceClock(waiting);
    const dispose = runClockLoop(clock);
    for (let i = 1; i <= 5; i++) {
      clock.reset({ ...waiting, t: DAY_START + i });
      expect(vi.getTimerCount()).toBe(1);
    }
    dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dispose cancels a pending frame and the visibility listener", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    const dispose = runClockLoop(clock);
    expect(pendingFrames()).toBe(1);
    expect(listeners.get("visibilitychange")?.size).toBe(1);
    dispose();
    expect(pendingFrames()).toBe(0);
    expect(listeners.get("visibilitychange")?.size ?? 0).toBe(0);
    clock.pause();
    clock.play();
    expect(pendingFrames()).toBe(0);
  });

  it("dispose cancels a pending wake-up timeout and ignores later state changes", () => {
    vi.useFakeTimers({ now: new Date("2026-10-11T09:30:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
    const clock = new RaceClock({ ...SERVER_CLOCK, t: DAY_START, playing: true, live: true });
    const dispose = runClockLoop(clock);
    expect(vi.getTimerCount()).toBe(1);
    dispose();
    expect(vi.getTimerCount()).toBe(0);
    clock.pause();
    clock.setLive(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(pendingFrames()).toBe(0);
  });
});
