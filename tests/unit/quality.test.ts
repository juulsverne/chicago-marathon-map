import { describe, expect, it } from "vitest";
import { MODEL_RUNNERS } from "@/content/race";
import { FrameGovernor, frameStats } from "@/quality/governor";
import { TIERS, lowerTier, pixelRatioFor, readDeviceHints, startingTier, type Tier } from "@/quality/tiers";

describe("tiers", () => {
  it("set the runners, pixel ratio and sky for each tier", () => {
    expect(TIERS.high).toEqual({ runners: 5300, maxPixelRatio: 2, sky: "on" });
    expect(TIERS.medium).toEqual({ runners: 2650, maxPixelRatio: 1.5, sky: "simplified" });
    expect(TIERS.low).toEqual({ runners: 1325, maxPixelRatio: 1, sky: "off" });
    expect(TIERS.high.runners).toBe(MODEL_RUNNERS);
  });

  it("cap the pixel ratio on every device, desktops included", () => {
    expect(pixelRatioFor("high", 3)).toBe(2);
    expect(pixelRatioFor("medium", 2)).toBe(1.5);
    expect(pixelRatioFor("low", 2)).toBe(1);
    expect(pixelRatioFor("high", 1)).toBe(1);
  });

  it("step down one at a time and stop at low", () => {
    expect(lowerTier("high")).toBe("medium");
    expect(lowerTier("medium")).toBe("low");
    expect(lowerTier("low")).toBe("low");
  });
});

describe("startingTier", () => {
  it("starts Low with Save-Data, 2 or fewer cores, or 2 GB or less", () => {
    expect(startingTier({ saveData: true, cores: 16, memoryGb: 16 })).toBe("low");
    expect(startingTier({ cores: 2, memoryGb: 8 })).toBe("low");
    expect(startingTier({ cores: 8, memoryGb: 2 })).toBe("low");
  });

  it("starts Medium with 4 or fewer cores or 4 GB or less", () => {
    expect(startingTier({ cores: 4, memoryGb: 8 })).toBe("medium");
    expect(startingTier({ cores: 8, memoryGb: 4 })).toBe("medium");
  });

  it("starts High otherwise", () => {
    expect(startingTier({ saveData: false, cores: 8, memoryGb: 8 })).toBe("high");
  });

  it("ignores hints the browser does not expose (Safari has no deviceMemory)", () => {
    expect(startingTier({ cores: 8 })).toBe("high");
    expect(startingTier({ cores: 4 })).toBe("medium");
    expect(startingTier({ memoryGb: 8 })).toBe("high");
  });

  it("starts Medium when no hint is available at all", () => {
    expect(startingTier({})).toBe("medium");
    expect(startingTier({ saveData: false })).toBe("medium");
    expect(startingTier({ cores: 0 })).toBe("medium");
  });

  it("reads the hints from navigator", () => {
    const nav = { hardwareConcurrency: 6, deviceMemory: 4, connection: { saveData: false } } as unknown as Navigator;
    expect(readDeviceHints(nav)).toEqual({ saveData: false, cores: 6, memoryGb: 4 });
    expect(readDeviceHints({ hardwareConcurrency: 8 } as Navigator)).toEqual({ saveData: undefined, cores: 8, memoryGb: undefined });
  });
});

/** Feeds frames from `from` to `to` ms; `interval(i)` gives each frame's length. */
function play(gov: FrameGovernor, from: number, to: number, interval: (i: number) => number): { at: number; tier: Tier }[] {
  const changes: { at: number; tier: Tier }[] = [];
  let now = from;
  gov.frame(now);
  for (let i = 0; now < to; i++) {
    now += interval(i);
    const tier = gov.frame(now);
    if (tier) changes.push({ at: now, tier });
  }
  return changes;
}

describe("frameStats", () => {
  it("measures the median and the share of frames over 1.5x the median", () => {
    expect(frameStats([10, 10, 10, 10, 40])).toEqual({ median: 10, stutter: 0.2 });
    expect(frameStats([10, 20])).toEqual({ median: 15, stutter: 0 });
  });
});

describe("FrameGovernor", () => {
  it("keeps a steady 60 fps", () => {
    expect(play(new FrameGovernor("high", 0), 0, 20_000, () => 16.7)).toEqual([]);
  });

  it("keeps a steady 33 ms median with low variance (iOS Low Power Mode)", () => {
    const gov = new FrameGovernor("high", 0);
    expect(play(gov, 0, 30_000, (i) => 33.3 + (i % 3) * 0.4 - 0.4)).toEqual([]);
    expect(gov.tier).toBe("high");
  });

  it("steps down when more than 10% of frames stutter", () => {
    const changes = play(new FrameGovernor("high", 0), 0, 4900, (i) => (i % 8 === 0 ? 60 : 16.7)); // 12.5% at 60 ms
    expect(changes).toHaveLength(1);
    expect(changes[0].tier).toBe("medium");
    expect(changes[0].at).toBeGreaterThanOrEqual(3000);
  });

  it("does not step down while fewer than 10% of frames stutter", () => {
    expect(play(new FrameGovernor("high", 0), 0, 20_000, (i) => (i % 12 === 0 ? 60 : 16.7))).toEqual([]); // 8.3%
  });

  it("steps down when the median frame takes over 40 ms, one tier per window, down to Low", () => {
    const changes = play(new FrameGovernor("high", 0), 0, 20_000, () => 45);
    expect(changes.map((c) => c.tier)).toEqual(["medium", "low"]);
    expect(changes[1].at - changes[0].at).toBeGreaterThanOrEqual(2000);
  });

  it("ignores the first 3 s after the map is ready", () => {
    expect(play(new FrameGovernor("high", 1000), 1000, 3800, () => 100)).toEqual([]); // last frame at 3,900 ms
  });

  it("ignores frames while paused (camera moves, tab switches)", () => {
    const gov = new FrameGovernor("high", 0);
    play(gov, 0, 4000, () => 16.7);
    gov.pause();
    expect(play(gov, 4000, 9000, () => 120)).toEqual([]);
    gov.resume();
    expect(play(gov, 9000, 15_000, () => 16.7)).toEqual([]);
    expect(gov.tier).toBe("high");
  });

  it("promotes Medium to High once when the first 5 s are smooth", () => {
    const gov = new FrameGovernor("medium", 0);
    const changes = play(gov, 0, 8000, () => 16.6);
    expect(changes).toEqual([{ at: expect.any(Number), tier: "high" }]);
    expect(changes[0].at).toBeGreaterThanOrEqual(5000);
    expect(changes[0].at).toBeLessThan(5100);
  });

  it("does not promote when the first 5 s are not smooth enough", () => {
    expect(play(new FrameGovernor("medium", 0), 0, 10_000, () => 20)).toEqual([]);
    expect(play(new FrameGovernor("medium", 0), 0, 10_000, (i) => (i % 25 === 0 ? 40 : 16.6))).toEqual([]); // 4% stutter
  });

  it("never steps up otherwise", () => {
    const high = new FrameGovernor("high", 0);
    expect(play(high, 0, 10_000, () => 8)).toEqual([]);
    const gov = new FrameGovernor("medium", 0);
    play(gov, 0, 6000, () => 16.6); // promoted
    expect(gov.tier).toBe("high");
    const later = play(gov, 6000, 12_000, () => 45);
    expect(later.map((c) => c.tier)).toEqual(["medium", "low"]);
    expect(play(gov, 12_000, 30_000, () => 16.6)).toEqual([]);
    expect(gov.tier).toBe("low");
  });
});
