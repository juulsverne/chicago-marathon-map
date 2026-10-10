import { describe, expect, it } from "vitest";
import mapdata from "../../data/source/mapdata.json";
import fixture from "../fixtures/v1-model.json";
import { decode, type MapData } from "@/lib/geo/decode";
import { buildRoute } from "@/lib/geo/route";
import { FIELD, MODEL_RUNNERS, RUNNER_MODEL, WAVES, type RunnerModel } from "@/content/race";
import { arrivalTimes, formatPeople, generateRunners, people, runnerStats, segmentIndexAt, segmentTimes, writeDistances } from "@/model/runners";

const route = buildRoute((mapdata as unknown as MapData).course.map(decode));
const ends = route.segments.map((s) => s.d1);
// v1's model: waves at 7:30, 8:00 and 8:35 and a 4:30 median finish. Production moves
// Wave 1 to 7:35 and the median to about 4:20; parity uses v1's values.
const V1_MODEL: RunnerModel = { waveStarts: [450, 480, 515], medianFinish: 270 };
const v1Runners = generateRunners(1500, 1011, V1_MODEL);

describe("route parity with v1", () => {
  it("matches v1's length and segment spans", () => {
    expect(route.len).toBeCloseTo(fixture.len, 9);
    expect(route.points).toHaveLength(fixture.routePoints);
    route.segments.forEach((s, i) => {
      expect(s.d0).toBeCloseTo(fixture.segments[i].d0, 9);
      expect(s.d1).toBeCloseTo(fixture.segments[i].d1, 9);
    });
  });
});

describe("runner model parity with v1 (1,500 runners, seed 1011)", () => {
  it("generates the same runners", () => {
    fixture.runnersHead.forEach((r, i) => {
      expect(v1Runners[i].T).toBeCloseTo(r.T, 12);
      expect(v1Runners[i].wave).toBe(r.w);
      expect(v1Runners[i].start).toBeCloseTo(r.start, 12);
      expect(v1Runners[i].jit).toBeCloseTo(r.jit, 12);
    });
    const sum = (key: "T" | "start" | "jit") => v1Runners.reduce((a, r) => a + r[key], 0);
    expect(sum("T")).toBeCloseTo(fixture.sums.T, 6);
    expect(sum("start")).toBeCloseTo(fixture.sums.start, 6);
    expect(sum("jit")).toBeCloseTo(fixture.sums.jit, 9);
  });

  it("computes the same arrival times for every segment", () => {
    const times = segmentTimes(v1Runners, route.segments, route.len);
    times.forEach((t, i) => {
      expect(t.first).toBeCloseTo(fixture.segments[i].first, 9);
      expect(t.lead).toBeCloseTo(fixture.segments[i].lead, 9);
      expect(t.peak).toBeCloseTo(fixture.segments[i].peak, 9);
      expect(t.last).toBeCloseTo(fixture.segments[i].last, 9);
    });
  });

  it.each(fixture.stats)("counts runners like v1 at minute $t", (expected) => {
    const s = runnerStats(v1Runners, expected.t, route.len, ends);
    expect(s.on).toBe(expected.on);
    expect(s.finished).toBe(expected.fin);
    expect(s.waiting).toBe(expected.wait);
    expect(Array.from(s.active)).toEqual(expected.active);
  });
});

describe("helpers", () => {
  it("finds the segment containing a distance", () => {
    expect(segmentIndexAt(ends, 0)).toBe(0);
    expect(segmentIndexAt(ends, route.len)).toBe(40);
    expect(segmentIndexAt(ends, (route.segments[7].d0 + route.segments[7].d1) / 2)).toBe(7);
  });

  it("writes on-course distances and -1 for everyone else", () => {
    const out = new Float32Array(v1Runners.length);
    const onCourse = writeDistances(v1Runners, 572, route.len, out);
    expect(onCourse).toBe(fixture.stats[2].on);
    expect(Array.from(out).filter((d) => d >= 0)).toHaveLength(onCourse);
  });

  it.each([
    { t: 465, note: "some runners still waiting" },
    { t: 720, note: "some runners already finished" },
  ])("marks everyone off the course -1 and places the rest on the route at minute $t ($note)", ({ t }) => {
    const out = new Float32Array(v1Runners.length);
    const onCourse = writeDistances(v1Runners, t, route.len, out);
    const stats = runnerStats(v1Runners, t, route.len, ends);
    expect(stats.waiting + stats.finished).toBeGreaterThan(0);
    expect(onCourse).toBe(stats.on);
    expect(Array.from(out).filter((d) => d === -1)).toHaveLength(v1Runners.length - stats.on);
    v1Runners.forEach((r, k) => {
      const f = (t - r.start) / r.T;
      if (f <= 0 || f >= 1) {
        expect(out[k]).toBe(-1);
        return;
      }
      const expected = f * route.len;
      // The output is float32: 1e-3 m near the start, one part in 2^24 beyond 16.8 km
      // (above 32,768 m a float32 step is 0.004 m, so a flat 1e-3 m cannot hold there).
      expect(Math.abs(out[k] - expected)).toBeLessThanOrEqual(Math.max(1e-3, expected * 2 ** -24));
    });
  });

  it("defaults to the production model size", () => {
    expect(generateRunners()).toHaveLength(5300);
  });
});

describe("the fact-checked production model", () => {
  const field = generateRunners();
  const sorted = field.map((r) => r.T).sort((a, b) => a - b);

  it("starts Wave 1 at 7:35 (after the pros at 7:30), Wave 2 at 8:00 and Wave 3 at 8:35", () => {
    expect(RUNNER_MODEL.waveStarts).toEqual([455, 480, 515]);
    expect(WAVES.map((w) => w.start)).toEqual([...RUNNER_MODEL.waveStarts]);
    for (const w of [0, 1, 2] as const) {
      const starts = field.filter((r) => r.wave === w).map((r) => r.start);
      expect(Math.min(...starts)).toBeGreaterThanOrEqual(RUNNER_MODEL.waveStarts[w]);
      expect(Math.max(...starts)).toBeLessThan(RUNNER_MODEL.waveStarts[w] + 18);
    }
  });

  it("centres finish times on about 4:20", () => {
    expect(RUNNER_MODEL.medianFinish).toBe(260);
    expect(Math.abs(sorted[sorted.length >> 1] - 260)).toBeLessThan(2);
  });
});

describe("people", () => {
  it("scales modeled runners to the 55,000 field in hundreds", () => {
    expect(FIELD).toBe(55_000);
    expect(MODEL_RUNNERS).toBe(5_300);
    expect(people(MODEL_RUNNERS)).toBe(55_000);
    expect(people(0)).toBe(0);
    expect(people(1)).toBe(0); // 10.4 people round to 0 hundreds
    expect(people(100)).toBe(1_000); // 1,037.7
    expect(people(2_650)).toBe(27_500);
  });

  it("formats with US grouping in every locale", () => {
    expect(formatPeople(55_000)).toBe("55,000");
    expect(formatPeople(900)).toBe("900");
  });
});

describe("arrivalTimes", () => {
  it("matches segmentTimes at a segment's own start, middle and end", () => {
    const seg = route.segments[12];
    const times = segmentTimes(v1Runners, [seg], route.len)[0];
    expect(arrivalTimes(v1Runners, seg.d0, route.len).first).toBeCloseTo(times.first, 9);
    expect(arrivalTimes(v1Runners, seg.d0, route.len).lead).toBeCloseTo(times.lead, 9);
    expect(arrivalTimes(v1Runners, (seg.d0 + seg.d1) / 2, route.len).peak).toBeCloseTo(times.peak, 9);
    expect(arrivalTimes(v1Runners, seg.d1, route.len).last).toBeCloseTo(times.last, 9);
  });
});
