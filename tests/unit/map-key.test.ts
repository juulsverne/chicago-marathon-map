import { describe, expect, it } from "vitest";
import { KEY_COPY } from "@/content/map-key";
import { peoplePerDot } from "@/ui/map-key/map-key";

describe("map key", () => {
  it("says how many people a runner dot stands for at each quality tier", () => {
    // 55,000 people over 5,300, 2,650 and 1,325 dots.
    expect(peoplePerDot("high")).toBe(10);
    expect(peoplePerDot("medium")).toBe(21);
    expect(peoplePerDot("low")).toBe(42);
    expect(KEY_COPY.runners.rest(10)).toBe(": white dots. Each is about 10 people, and they bunch up where the crowd is thickest.");
  });

  it("keeps v1's entries, in v1's order, with v2's additions", () => {
    const labels = [KEY_COPY.closed, KEY_COPY.open, KEY_COPY.runners, KEY_COPY.mile, KEY_COPY.startFinish, KEY_COPY.leaders, KEY_COPY.record, KEY_COPY.pace, KEY_COPY.shading, KEY_COPY.spot].map((e) => e.label);
    expect(labels).toEqual([
      "Closed to cars",
      "Open to cars",
      "Runners",
      "Mile marker",
      "Start and finish",
      "Race leaders",
      "World-record pace",
      "Your pace",
      "Timeline shading",
      "Your spot",
    ]);
  });
});
