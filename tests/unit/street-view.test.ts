import { describe, expect, it } from "vitest";
import { SEGMENTS } from "@/model/course";
import { AREA_VIEWS, formatClockRange, ganttSpans, matchesQuery, milesText, reopensText } from "@/ui/streets/street-view";

describe("street list view", () => {
  it("draws a street's closure and its runners on the 5:00 AM to 7:00 PM timeline", () => {
    const columbus = ganttSpans(SEGMENTS[0]);
    expect(columbus.closed[0]).toBeCloseTo(60 / 840, 9); // 6:00 AM
    expect(columbus.closed[1]).toBeCloseTo(330 / 840, 9); // 10:30 AM
    expect(columbus.runners[0]).toBeCloseTo((SEGMENTS[0].first - 300) / 840, 9);
    expect(columbus.runners[1]).toBeCloseTo((SEGMENTS[0].last - 300) / 840, 9);
    expect(ganttSpans(SEGMENTS[40]).closed).toEqual([0, 1]); // the finish area, all day
  });

  it("writes reopening times and mile spans", () => {
    expect(reopensText(SEGMENTS[0])).toBe("10:30 AM");
    expect(reopensText(SEGMENTS[39])).toBe("6:00 PM");
    expect(reopensText(SEGMENTS[40])).toBe("Mon 3:00 PM");
    expect(milesText(SEGMENTS[0])).toBe("mi 0.0–0.7");
  });

  it("groups the 41 closures into v1's six neighborhoods with their summaries", () => {
    expect(AREA_VIEWS.map((a) => a.segments.length)).toEqual([5, 12, 4, 6, 7, 7]);
    expect(AREA_VIEWS[0]).toMatchObject({ name: "Grant Park & the Loop", summary: "Miles 0.0 to 4.7 · 5 streets", reopens: "Reopen 10:30–11:30 AM", finish: false });
    expect(AREA_VIEWS[1].reopens).toBe("Reopen 12:00–1:15 PM");
    expect(AREA_VIEWS[5]).toMatchObject({ summary: "Miles 22.1 to 26.2 · 7 streets", reopens: "Reopen 4:00–6:00 PM", finish: true });
  });

  it("formats time ranges compactly", () => {
    expect(formatClockRange(630, 690)).toBe("10:30–11:30 AM");
    expect(formatClockRange(690, 795)).toBe("11:30 AM–1:15 PM");
    expect(formatClockRange(810, 810)).toBe("1:30 PM");
  });

  it("searches street and range, case-insensitively, like v1", () => {
    const halsted = SEGMENTS.filter((s) => matchesQuery(s, "  HALSTED "));
    expect(halsted.map((s) => s.street)).toEqual(["Jackson Blvd", "Halsted St", "Taylor St", "18th St", "Halsted St", "21st St"]);
    expect(SEGMENTS.filter((s) => matchesQuery(s, ""))).toHaveLength(41);
    expect(SEGMENTS.filter((s) => matchesQuery(s, "zzz"))).toHaveLength(0);
  });
});
