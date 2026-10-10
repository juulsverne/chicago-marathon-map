import { describe, expect, it, vi } from "vitest";
import { RaceClock, SERVER_CLOCK, initialClock } from "@/model/clock";

const NOW_9AM_RACE_DAY = new Date("2026-10-11T14:00:00Z");

describe("initialClock", () => {
  it("opens a replay at 5:50 AM and plays unless motion is reduced", () => {
    const friday = new Date("2026-10-09T18:00:00Z");
    expect(initialClock(friday, false)).toEqual({ t: 350, playing: true, speed: 5, live: false });
    expect(initialClock(friday, true)).toEqual({ t: 350, playing: false, speed: 5, live: false });
  });

  it("opens Live during race hours", () => {
    expect(initialClock(NOW_9AM_RACE_DAY, false)).toEqual({ t: 540, playing: true, speed: 5, live: true });
    expect(initialClock(new Date("2026-10-11T09:30:00Z"), false).live).toBe(false);
  });
});

describe("RaceClock", () => {
  const playing = (t: number) => new RaceClock({ ...SERVER_CLOCK, t, playing: true });

  it("advances at the selected speed", () => {
    const clock = playing(350);
    clock.advance(1);
    expect(clock.getSnapshot().t).toBe(355);
  });

  it("skims the quiet stretch between closures and the gun at default speed only", () => {
    const clock = playing(400);
    clock.advance(1);
    expect(clock.getSnapshot().t).toBe(420);
    const slow = new RaceClock({ ...SERVER_CLOCK, t: 400, playing: true, speed: 1 });
    slow.advance(1);
    expect(slow.getSnapshot().t).toBe(401);
  });

  it("stops at 7:00 PM and restarts from 5:50 AM on play", () => {
    const clock = playing(1139);
    clock.advance(1);
    expect(clock.getSnapshot()).toMatchObject({ t: 1140, playing: false });
    clock.play();
    expect(clock.getSnapshot()).toMatchObject({ t: 350, playing: true });
  });

  it("does nothing and notifies no one while paused", () => {
    const clock = new RaceClock(SERVER_CLOCK);
    const listener = vi.fn();
    clock.subscribe(listener);
    clock.advance(1);
    expect(listener).not.toHaveBeenCalled();
    clock.play();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("clamps seeks to the timeline and leaves Live", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, live: true });
    clock.seek(100);
    expect(clock.getSnapshot()).toMatchObject({ t: 300, live: false });
    clock.seek(2000);
    expect(clock.getSnapshot().t).toBe(1140);
  });

  it("follows the real Chicago clock in Live", () => {
    let now = NOW_9AM_RACE_DAY;
    const clock = new RaceClock(SERVER_CLOCK, () => now);
    clock.setLive(true);
    expect(clock.getSnapshot()).toMatchObject({ t: 540, live: true, playing: true });
    now = new Date("2026-10-11T14:01:00Z");
    clock.advance(0.016);
    expect(clock.getSnapshot().t).toBe(541);
    clock.setSpeed(15);
    expect(clock.getSnapshot()).toMatchObject({ speed: 15, live: false });
  });
});

describe("RaceClock Live limits", () => {
  const NOW_8PM_RACE_DAY = new Date("2026-10-12T01:00:00Z"); // 8:00 PM CDT on Oct 11
  const NOW_430AM_RACE_DAY = new Date("2026-10-11T09:30:00Z"); // 4:30 AM CDT on Oct 11

  it("ends Live as a replay at 7:00 PM, from setLive and from advance", () => {
    const viaSetLive = new RaceClock(SERVER_CLOCK, () => NOW_8PM_RACE_DAY);
    viaSetLive.setLive(true);
    expect(viaSetLive.getSnapshot()).toMatchObject({ t: 1140, live: false, playing: false });

    const viaAdvance = new RaceClock({ ...SERVER_CLOCK, t: 1100, live: true, playing: true }, () => NOW_8PM_RACE_DAY);
    viaAdvance.advance(0.016);
    expect(viaAdvance.getSnapshot()).toMatchObject({ t: 1140, live: false, playing: false });
  });

  it("holds Live at the start until 5:00 AM and reports the wait in milliseconds", () => {
    const clock = new RaceClock(SERVER_CLOCK, () => NOW_430AM_RACE_DAY);
    clock.setLive(true);
    expect(clock.getSnapshot()).toMatchObject({ t: 300, live: true, playing: true });
    expect(clock.liveWaitMs()).toBe(30 * 60_000);
  });

  it("reports no wait during Live hours or outside Live", () => {
    expect(new RaceClock({ ...SERVER_CLOCK, live: true }, () => NOW_430AM_RACE_DAY).liveWaitMs()).toBe(30 * 60_000);
    expect(new RaceClock({ ...SERVER_CLOCK, live: true }, () => NOW_9AM_RACE_DAY).liveWaitMs()).toBe(0);
    expect(new RaceClock(SERVER_CLOCK, () => NOW_430AM_RACE_DAY).liveWaitMs()).toBe(0);
  });
});

describe("RaceClock Live and the calendar", () => {
  const NOW_OCT12_8AM = new Date("2026-10-12T13:00:00Z"); // 8:00 AM CDT, the day after the race
  const NOW_OCT12_1230AM = new Date("2026-10-12T05:30:00Z"); // 12:30 AM CDT, the day after the race
  const NOW_OCT10_10AM = new Date("2026-10-10T15:00:00Z"); // 10:00 AM CDT, the day before the race
  const NOW_230AM_RACE_DAY = new Date("2026-10-11T07:30:00Z"); // 2:30 AM CDT on race day
  const liveAt5PM = { ...SERVER_CLOCK, t: 1020, playing: true, live: true };

  it("ends a Live left on overnight as a paused replay at 7:00 PM, not as Live at the morning's clock", () => {
    const clock = new RaceClock(liveAt5PM, () => NOW_OCT12_8AM);
    clock.advance(0.016);
    expect(clock.getSnapshot()).toMatchObject({ t: 1140, live: false, playing: false });
  });

  it("waits for nothing after race day, even in the small hours", () => {
    const clock = new RaceClock(liveAt5PM, () => NOW_OCT12_1230AM);
    expect(clock.liveWaitMs()).toBe(0);
    clock.advance(0.016);
    expect(clock.getSnapshot()).toMatchObject({ t: 1140, live: false, playing: false });
  });

  it("refuses to enter Live before race day and leaves the state untouched", () => {
    const paused = new RaceClock({ ...SERVER_CLOCK, t: 600 }, () => NOW_OCT10_10AM);
    const listener = vi.fn();
    paused.subscribe(listener);
    paused.setLive(true);
    expect(paused.getSnapshot()).toEqual({ ...SERVER_CLOCK, t: 600 });
    expect(listener).not.toHaveBeenCalled();

    const replaying = new RaceClock({ ...SERVER_CLOCK, t: 600, playing: true }, () => NOW_OCT10_10AM);
    replaying.setLive(true);
    expect(replaying.getSnapshot()).toEqual({ ...SERVER_CLOCK, t: 600, playing: true });
  });

  it("refuses to enter Live before 4:00 AM on race day", () => {
    const clock = new RaceClock({ ...SERVER_CLOCK, t: 600 }, () => NOW_230AM_RACE_DAY);
    clock.setLive(true);
    expect(clock.getSnapshot()).toEqual({ ...SERVER_CLOCK, t: 600 });
  });

  it("turns a running Live off in place when the clock reads before race day", () => {
    const beforeRaceDay = new RaceClock({ ...SERVER_CLOCK, t: 700, playing: true, live: true }, () => NOW_OCT10_10AM);
    expect(beforeRaceDay.liveWaitMs()).toBe(0);
    beforeRaceDay.advance(0.016);
    expect(beforeRaceDay.getSnapshot()).toMatchObject({ t: 700, live: false, playing: false });

    const tooEarly = new RaceClock({ ...SERVER_CLOCK, t: 300, playing: true, live: true }, () => NOW_230AM_RACE_DAY);
    expect(tooEarly.liveWaitMs()).toBe(0);
    tooEarly.advance(0.016);
    expect(tooEarly.getSnapshot()).toMatchObject({ t: 300, live: false, playing: false });
  });

  it("waits only between 4:00 and 5:00 AM on race day", () => {
    const at = (iso: string) => new RaceClock({ ...SERVER_CLOCK, live: true }, () => new Date(iso)).liveWaitMs();
    expect(at("2026-10-11T09:00:00Z")).toBe(60 * 60_000); // 4:00 AM CDT
    expect(at("2026-10-11T08:59:00Z")).toBe(0); // 3:59 AM CDT
    expect(at("2026-10-11T10:00:00Z")).toBe(0); // 5:00 AM CDT
    expect(at("2026-10-12T09:30:00Z")).toBe(0); // 4:30 AM CDT the next day
  });

  it("still enters Live at 7:00 PM sharp as an ended replay", () => {
    const clock = new RaceClock(SERVER_CLOCK, () => new Date("2026-10-12T00:00:00Z")); // 7:00 PM CDT
    clock.setLive(true);
    expect(clock.getSnapshot()).toMatchObject({ t: 1140, live: false, playing: false });
  });
});

describe("RaceClock listeners", () => {
  it("keeps notifying the others when one listener throws, and reports the error", () => {
    const report = vi.fn();
    vi.stubGlobal("reportError", report);
    try {
      const clock = new RaceClock(SERVER_CLOCK);
      const boom = new Error("renderer failed");
      const after = vi.fn();
      clock.subscribe(() => {
        throw boom;
      });
      clock.subscribe(after);
      clock.seek(400);
      expect(clock.getSnapshot().t).toBe(400);
      expect(after).toHaveBeenCalledTimes(1);
      expect(report).toHaveBeenCalledWith(boom);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
