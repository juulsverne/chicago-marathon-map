import { describe, expect, it } from "vitest";
import { CLOSURES } from "@/content/closures";
import { STORY, noticeRows } from "@/content/story";
import { storyMap } from "@/ui/story/story-map";

describe("the flyer-to-map story", () => {
  it("recreates the notice's 41 rows in race order, with their reopening times", () => {
    const rows = noticeRows();
    expect(rows).toHaveLength(41);
    expect(rows.map((r) => r.street)).toEqual(CLOSURES.map((c) => c.street));
    expect(rows[0]).toEqual({ street: "Columbus Dr", range: "Start to Grand Ave", reopens: "10:30 AM" });
    // The finish area stays closed until Monday afternoon.
    expect(rows[40].reopens).toBe("Mon 3:00 PM");
  });

  it("states the four build principles in order", () => {
    expect(STORY.principles.map((p) => p.title)).toEqual([
      "Start from the real question",
      "Use the city's data",
      "Model what isn't published",
      "Phone first",
    ]);
  });

  it("closes on its last line and tells the build history honestly", () => {
    expect(STORY.close).toBe("Every city posts notices like this one. Most of them could be a map.");
    expect(STORY.history).toBe("Prototyped in an evening as a single web page, then rebuilt as a proper app.");
    expect(STORY.builtWith).toContain("Claude");
  });

  it("uses the fact-checked numbers and attributions", () => {
    const text = JSON.stringify(STORY);
    expect(text).toContain("55,000");
    expect(text).not.toContain("53,000");
    expect(text).toContain("the marathon's street-closure notice");
  });
});

describe("the story's course map", () => {
  const map = storyMap();

  it("draws one path per closure inside its view box", () => {
    expect(map.paths).toHaveLength(41);
    for (const d of map.paths) expect(d).toMatch(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/);
    const coords = map.paths.flatMap((d) => d.slice(1).split("L").map((p) => p.split(" ").map(Number)));
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(map.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(map.height);
    }
  });

  it("keeps consecutive streets joined, so the course reads as one line", () => {
    const end = (d: string) => d.split("L").at(-1)!.split(" ").map(Number);
    const start = (d: string) => d.slice(1).split("L")[0].split(" ").map(Number);
    for (let i = 1; i < map.paths.length; i++) {
      const [ax, ay] = end(map.paths[i - 1]);
      const [bx, by] = start(map.paths[i]);
      expect(Math.hypot(ax - bx, ay - by)).toBeLessThan(0.5);
    }
  });
});
