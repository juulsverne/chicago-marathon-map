import { describe, expect, it } from "vitest";
import { clipLine, clipRing, type Box } from "@/lib/geo/clip";

const box: Box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

describe("clipRing", () => {
  it("keeps a ring that is fully inside", () => {
    const ring = [[1, 1], [9, 1], [9, 9], [1, 9]] as const;
    expect(clipRing(ring, box)).toEqual(ring);
  });

  it("drops a ring that is fully outside", () => {
    expect(clipRing([[20, 20], [30, 20], [30, 30]], box)).toEqual([]);
  });

  it("cuts a ring that crosses the edge", () => {
    expect(clipRing([[5, 5], [15, 5], [15, 8], [5, 8]], box)).toEqual([[5, 5], [10, 5], [10, 8], [5, 8]]);
  });
});

describe("clipLine", () => {
  it("keeps a line that is fully inside", () => {
    expect(clipLine([[1, 1], [2, 2], [3, 1]], box)).toEqual([[[1, 1], [2, 2], [3, 1]]]);
  });

  it("cuts a line where it leaves the box", () => {
    expect(clipLine([[5, 5], [15, 5]], box)).toEqual([[[5, 5], [10, 5]]]);
  });

  it("splits a line that leaves and comes back", () => {
    expect(clipLine([[2, 5], [20, 5], [20, 8], [2, 8]], box)).toEqual([
      [[2, 5], [10, 5]],
      [[10, 8], [2, 8]],
    ]);
  });

  it("drops a line that is fully outside", () => {
    expect(clipLine([[20, 20], [30, 30]], box)).toEqual([]);
  });
});
