import { describe, expect, it } from "vitest";
import { SEGMENTS } from "@/model/course";
import { closureSentence } from "@/model/closure-sentence";
import { closedCount, isClosed, nextToReopen } from "@/model/closures";

const columbus = SEGMENTS[0];
const finish = SEGMENTS[40];

describe("closure state", () => {
  it("closes every street at 6:00 AM and holds the finish area all day", () => {
    expect(closedCount(359)).toBe(1);
    expect(closedCount(360)).toBe(41);
    expect(isClosed(finish, 1139)).toBe(true);
  });

  it("reopens streets on schedule", () => {
    expect(isClosed(columbus, 629)).toBe(true);
    expect(isClosed(columbus, 630)).toBe(false);
    expect(closedCount(630)).toBe(39);
  });

  it("names the next street to reopen", () => {
    expect(nextToReopen(359)).toBeNull();
    expect(nextToReopen(400)?.slug).toBe("columbus-dr-start-to-grand-ave");
    expect(nextToReopen(630)?.slug).toBe("dearborn-st-grand-ave-to-jackson-blvd");
    expect(nextToReopen(1100)).toBeNull();
  });
});

// Standalone times carry "CT", and the after-the-runners stage follows
// the organizer's reopening rule instead of v1's unsourced crews (source S2).
describe("closureSentence", () => {
  it("covers every stage of a street's day", () => {
    expect(closureSentence(columbus, 350, 0)).toBe("Open now. Closes at 6:00 AM CT, 10m from now.");
    expect(closureSentence(columbus, 400, 0)).toBe(
      "Runners have not arrived yet. Wheelchair racers come through around 7:20 AM CT, the elite field around 7:30 AM CT.",
    );
    expect(closureSentence(columbus, 460, 12)).toBe("The race is passing through right now. Reopens at 10:30 AM CT.");
    expect(columbus.last).toBeLessThan(600);
    expect(closureSentence(columbus, 600, 0)).toBe(
      "The main field has passed. It reopens at 10:30 AM CT, in 30m, after the final runners at a 15-minute-mile pace.",
    );
    expect(closureSentence(columbus, 640, 0)).toBe("Open again. It reopened at 10:30 AM CT.");
  });

  it("describes the finish area", () => {
    expect(closureSentence(finish, 600, 3)).toBe("Runners are finishing right now.");
    expect(closureSentence(finish, 1100, 0)).toBe("Closed from Thursday 6:00 AM until Monday 3:00 PM CT for the finish area.");
  });
});
