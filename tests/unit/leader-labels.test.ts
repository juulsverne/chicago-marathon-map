import { describe, expect, it } from "vitest";
import type { LeaderId } from "@/content/race";
import { LABEL_HEIGHT, layoutLeaderLabels, type LeaderPoint } from "@/map/leader-labels";

const widths = new Map<LeaderId, number>([
  ["men", 90],
  ["wr", 110],
  ["wom", 100],
]);
const at = (id: LeaderId, x: number, y: number): LeaderPoint => ({ id, x, y, r: 6 });

describe("layoutLeaderLabels", () => {
  it("puts a pill up and to the right of its marker, like v1", () => {
    const [p] = layoutLeaderLabels([at("men", 100, 200)], widths);
    expect(p).toMatchObject({ x: 111, y: 181, lifted: false });
  });

  it("lifts a pill that would overlap an earlier one, with a line back to its marker", () => {
    const [first, second] = layoutLeaderLabels([at("men", 100, 200), at("wr", 104, 202)], widths);
    expect(first.lifted).toBe(false);
    expect(second.lifted).toBe(true);
    expect(first.y - second.y).toBeGreaterThanOrEqual(LABEL_HEIGHT);
    expect(second.line).toEqual([104, 196, 121, second.y + LABEL_HEIGHT]);
  });

  it("stacks up to four steps and leaves far-apart pills alone", () => {
    const stacked = layoutLeaderLabels([at("men", 100, 200), at("wr", 100, 200), at("wom", 100, 200)], widths);
    expect(new Set(stacked.map((p) => p.y)).size).toBe(3);
    const apart = layoutLeaderLabels([at("men", 100, 200), at("wr", 400, 200)], widths);
    expect(apart.every((p) => !p.lifted)).toBe(true);
  });
});
