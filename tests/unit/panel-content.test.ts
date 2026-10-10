import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EVENTS } from "@/content/events";
import type { RaceResults } from "@/content/results";
import { ResultsSlot } from "@/ui/panel/ResultsSlot";
import { Tensed } from "@/ui/panel/Tensed";
import { agendaStates } from "@/ui/race/AgendaItem";
import { hoursMinutes, laneFraction, laneMiles, leftToRun, pacePerMile } from "@/ui/race/lanes";

const SAMPLE: RaceResults = {
  title: "2026 winners",
  asOf: "Official results, Oct 11, 2026",
  rows: [{ category: "Men", name: "A. Runner", country: "KEN", time: "2:03:00" }],
  sources: ["S1"],
};

describe("results slot", () => {
  it("renders nothing until results are filled in", () => {
    expect(renderToStaticMarkup(createElement(ResultsSlot))).toBe("");
    expect(renderToStaticMarkup(createElement(ResultsSlot, { results: null }))).toBe("");
  });

  it("renders the results once they exist", () => {
    const html = renderToStaticMarkup(createElement(ResultsSlot, { results: SAMPLE }));
    expect(html).toContain("2026 winners");
    expect(html).toContain("A. Runner");
    expect(html).toContain("2:03:00");
  });
});

describe("tensed copy", () => {
  it("renders both tenses for the page to choose from, or one when they agree", () => {
    const both = renderToStaticMarkup(createElement(Tensed, { text: { future: "closes", past: "closed" } }));
    expect(both).toBe('<span class="tense-future">closes</span><span class="tense-past">closed</span>');
    expect(renderToStaticMarkup(createElement(Tensed, { text: { future: "same", past: "same" } }))).toBe("same");
  });
});

describe("race day at a glance", () => {
  it("marks moments reached, the next one, and the rest", () => {
    expect(agendaStates(EVENTS, 350)).toEqual(["next", ...Array(8).fill("future")]);
    const at930 = agendaStates(EVENTS, 570);
    expect(at930.slice(0, 4)).toEqual(["past", "past", "past", "past"]);
    expect(at930[4]).toBe("next"); // ~9:32 AM, first runner finishes
    expect(agendaStates(EVENTS, 1140).every((s) => s === "past")).toBe(true);
  });
});

describe("when Sawe finished", () => {
  it("puts each runner where they are at 1:59:30", () => {
    expect(laneFraction(119.5)).toBe(1);
    expect(laneMiles(119.5)).toBe("26.2");
    expect(laneMiles(260)).toBe("12.0");
    expect(laneMiles(270)).toBe("11.6");
    expect(hoursMinutes(270)).toBe("4:30");
    expect(pacePerMile(270)).toBe("10:18");
    expect(leftToRun(270)).toBe("2h 31m");
  });
});
