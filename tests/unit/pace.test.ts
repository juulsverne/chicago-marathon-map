import { describe, expect, it } from "vitest";
import { youLeader, youWave } from "@/model/pace";
import { shownLeaders } from "@/ui/leader-settings";
import { calculatorSentence } from "@/ui/race/Calculator";
import { boardRows } from "@/ui/race/race-view";

describe("your pace", () => {
  it("guesses the wave from the marathon time, as v1 did", () => {
    expect([youWave(200), youWave(225), youWave(226), youWave(270), youWave(271)]).toEqual([0, 0, 1, 1, 2]);
  });

  it("starts 8 minutes after that wave's gun (Wave 1 now at 7:35)", () => {
    expect(youLeader(210)).toMatchObject({ id: "you", T: 210, start: 463 });
    expect(youLeader(270)).toMatchObject({ T: 270, start: 488 });
    expect(youLeader(300)).toMatchObject({ T: 300, start: 523 });
  });

  it("writes v1's sentence", () => {
    expect(calculatorSentence(270)).toBe("That is 10:18 per mile, likely in Wave 2. When Sawe crossed the line you would be at mile 11.6, with 2h 31m still to run.");
  });
});

describe("shown leaders", () => {
  it("draws world-record pace by default and your pace only on request", () => {
    expect(shownLeaders({ you: false, wr: true, youMinutes: 270 }).map((l) => l.id)).toEqual(["wcm", "wcw", "men", "wom", "wr"]);
    expect(shownLeaders({ you: true, wr: false, youMinutes: 240 }).map((l) => l.id)).toEqual(["wcm", "wcw", "men", "wom", "you"]);
    expect(shownLeaders({ you: true, wr: true, youMinutes: 240 }).find((l) => l.id === "you")).toMatchObject({ T: 240, start: 488 });
  });

  it("puts your wave and goal on the board", () => {
    const [you] = boardRows(shownLeaders({ you: true, wr: false, youMinutes: 240 }).filter((l) => l.id === "you"), 400);
    expect(you).toMatchObject({ name: "Your pace", sub: "Wave 2, 4:00 goal", value: "starts 8:08a" });
  });
});
