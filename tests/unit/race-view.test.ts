import { describe, expect, it } from "vitest";
import { LEADERS, leader } from "@/content/race";
import { pointAt } from "@/model/course";
import { boardRows, leaderState, mileBins, nearestHood, raceClock, story } from "@/ui/race/race-view";
import { modelRunners, statsAt } from "@/ui/model-stats";

const at = (t: number) => story(t, statsAt(t), modelRunners());

describe("the Race tab's story (v1, fact-checked)", () => {
  it("walks through the morning", () => {
    expect(at(350).head).toBe("Quiet before the race");
    expect(at(400)).toEqual({
      head: "Streets are closed",
      sub: "All 41 course streets are closed to cars. Runners are filling the start corrals on Columbus Dr.",
      sources: ["S1", "S22"],
    });
    expect(at(445).sub).toBe("Men started at 7:20, women at 7:21. The pros go at 7:30, Wave 1 at 7:35.");
  });

  it("names the men's leader from the gun, where v1 said everyone had finished", () => {
    expect(at(450)).toEqual({ head: "Men's leader near the Loop, mile 0.0", sub: "55,000 runners are still waiting to start. 0 people are on the course." });
    const nine = at(540);
    expect(nine.head).toMatch(/^Men's leader near .+, mile 19\.3$/);
    expect(nine.sub).toMatch(/^The wheelchair winner is already home\. [\d,]+ people are on the course\.$/);
  });

  it("follows the women's leader, then the back of the pack", () => {
    expect(at(580).head).toMatch(/^Men's winner is in\. Women's leader at mile 2\d\.\d$/);
    expect(at(700).head).toMatch(/^[\d,]+ runners still on the course$/);
    expect(at(700).sub).toMatch(/^The back of the pack is near .+\. [\d,]+ people have finished\.$/);
  });

  it("ends with the streets still to reopen", () => {
    expect(at(1000)).toEqual({ head: "Everyone has finished", sub: "2 streets are still closed until their scheduled reopening. The last, Roosevelt Rd, reopens at 6:00 PM CT." });
    expect(at(1080).head).toBe("Race day is done");
  });
});

describe("race figures", () => {
  it("counts the race clock from the 7:30 gun", () => {
    expect(raceClock(350)).toBe("-1:40");
    expect(raceClock(450)).toBe("0:00");
    expect(raceClock(515)).toBe("1:05");
  });

  it("places leaders and names the nearest neighborhood", () => {
    expect(leaderState(leader("men"), 440)).toEqual({ kind: "wait", f: 0, mile: 0 });
    expect(leaderState(leader("men"), 572.5).kind).toBe("done");
    expect(leaderState(leader("men"), 511.25).mile).toBeCloseTo(26.219 / 2, 6);
    expect(nearestHood(pointAt(0))).toBe("the Loop");
  });

  it("bins the full model's runners by mile", () => {
    for (const t of [470, 540, 720]) {
      const bins = mileBins(modelRunners(), t);
      expect(bins).toHaveLength(27);
      expect(bins.reduce((a, b) => a + b, 0)).toBe(statsAt(t).on);
    }
  });

  it("boards each leader with where they are", () => {
    const rows = boardRows(LEADERS.filter((l) => l.shownByDefault), 540);
    expect(rows.map((r) => r.id)).toEqual(["wcm", "wcw", "men", "wom", "wr"]);
    expect(rows[0]).toMatchObject({ name: "Wheelchair men", value: "done 8:45a" });
    expect(rows[2].value).toBe("mile 19.3");
    expect(rows[2].sub).toMatch(/^about 2:02:30 pace · near /);
    expect(boardRows([leader("men")], 400)[0].value).toBe("starts 7:30a");
  });
});
