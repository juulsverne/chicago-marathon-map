import { describe, expect, it } from "vitest";
import histogram from "@/data/histogram.json";
import { COPY } from "@/content/copy";
import { DAY_END, DAY_START, MODEL_RUNNERS } from "@/content/race";
import { nextSpeed } from "@/model/clock";
import { ROUTE_LEN, SEGMENT_ENDS } from "@/model/course";
import { generateRunners, runnerStats } from "@/model/runners";
import { MOMENTS, currentMoment, timelineFraction } from "@/ui/moments";
import { histogramPath } from "@/ui/RunnerHistogram";

describe("runner histogram data", () => {
  it("counts runners on the course every 2 minutes across the timeline, from the model", () => {
    const runners = generateRunners(MODEL_RUNNERS);
    expect(histogram.from).toBe(DAY_START);
    expect(histogram.step).toBe(2);
    expect(histogram.counts).toHaveLength((DAY_END - DAY_START) / 2 + 1);
    histogram.counts.forEach((count, i) => {
      expect(count).toBe(runnerStats(runners, DAY_START + i * 2, ROUTE_LEN, SEGMENT_ENDS).on);
    });
  });

  it("is empty before the gun and after the last finisher, and peaks with everyone out", () => {
    const at = (t: number) => histogram.counts[(t - DAY_START) / 2];
    expect(at(450)).toBe(0);
    expect(at(540)).toBe(MODEL_RUNNERS);
    expect(at(930)).toBe(0);
  });

  it("draws as a closed area one unit per minute wide", () => {
    const d = histogramPath([0, 10, 5], 2);
    expect(d).toBe("M0 20L0 20.00L2 2.00L4 11.00L840 20Z");
  });
});

describe("timeline controls", () => {
  it("cycles speed 1, 5, 15 and back", () => {
    expect([nextSpeed(1), nextSpeed(5), nextSpeed(15)]).toEqual([5, 15, 1]);
  });

  it("ticks the five key moments in time order", () => {
    expect(MOMENTS.map((m) => m.dock.short)).toEqual(["6:00a", "7:30a", "~9:32a", "~3:20p", "6:00p"]);
    expect(timelineFraction(DAY_START)).toBe(0);
    expect(timelineFraction(DAY_END)).toBe(1);
    expect(timelineFraction(720)).toBe(0.5);
  });

  it("names the clock's phase before the first moment and from each one on", () => {
    expect(COPY.phases).toHaveLength(MOMENTS.length + 1);
  });

  it("marks the last moment reached as current", () => {
    expect(currentMoment(359)).toBe(-1);
    expect(currentMoment(360)).toBe(0);
    expect(currentMoment(600)).toBe(2);
    expect(currentMoment(1140)).toBe(4);
  });
});
