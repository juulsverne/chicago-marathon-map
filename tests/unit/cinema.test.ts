import { describe, expect, it } from "vitest";
import { ClosureTween } from "@/map/closure-tween";
import { KEY_MOMENTS, keyMomentFactor, rippleDelay } from "@/model/cinema";
import { RaceClock, SERVER_CLOCK } from "@/model/clock";

describe("key moments", () => {
  it("are the first finisher and the first reopening", () => {
    expect(KEY_MOMENTS).toEqual([572, 630]);
  });

  it("slow default-speed playback to 2 sim-min/s for 3 sim-min around each, easing in and out", () => {
    expect(keyMomentFactor(572)).toBeCloseTo(0.4, 6);
    expect(keyMomentFactor(572 - 1.5)).toBeCloseTo(0.4, 6);
    expect(keyMomentFactor(630 + 1.5)).toBeCloseTo(0.4, 6);
    expect(keyMomentFactor(540)).toBe(1);
    const easing = keyMomentFactor(572 - 2.25);
    expect(easing).toBeGreaterThan(0.4);
    expect(easing).toBeLessThan(1);
  });
});

describe("the closure ripple at 6:00", () => {
  it("staggers the 41 closures in race order over 1.2 s", () => {
    expect(rippleDelay(0)).toBe(0);
    expect(rippleDelay(40)).toBe(1200);
    expect(rippleDelay(20)).toBe(600);
  });

  it("starts each segment's tween after its delay", () => {
    const tween = new ClosureTween(3, 400);
    tween.retarget(() => false, 0, false);
    tween.retarget(() => true, 1000, true, (i) => i * 600);
    const at = (now: number) => {
      const out: number[] = [];
      tween.step(now, (i, v) => (out[i] = v));
      return out;
    };
    const mid = at(1300);
    expect(mid[0]).toBeGreaterThan(0.5); // 300 of 400 ms in
    expect(mid[1] ?? 0).toBe(0); // starts at 1600
    expect(at(2700)).toEqual([1, 1, 1]); // every segment has arrived
  });
});

describe("the race clock during the opening", () => {
  it("holds at 5:50 while held, still reading as playing, and moves once released", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, playing: true });
    clock.hold(true);
    clock.advance(1);
    expect(clock.getSnapshot()).toMatchObject({ t: 350, playing: true });
    clock.hold(false);
    clock.advance(1);
    expect(clock.getSnapshot().t).toBe(355);
  });

  it("slows around key moments only while cinematic, at the default speed", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, t: 572, playing: true });
    clock.setCinematic(true);
    clock.advance(1);
    expect(clock.getSnapshot().t).toBeCloseTo(574, 6);
    clock.setCinematic(false);
    clock.advance(1);
    expect(clock.getSnapshot().t).toBeCloseTo(579, 6);
    const fast = new RaceClock({ ...SERVER_CLOCK, t: 572, playing: true, speed: 15 });
    fast.setCinematic(true);
    fast.advance(1);
    expect(fast.getSnapshot().t).toBe(587);
  });
});
