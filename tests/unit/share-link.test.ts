import { describe, expect, it } from "vitest";
import { DAY_END, DAY_START } from "@/content/race";
import { initialClock } from "@/model/clock";
import { SEGMENTS } from "@/model/course";
import { formatShareTime, parseShareSlug, parseShareTime, readShareLink, shareHref } from "@/model/share-link";

const PAGE = "https://lab.elijahos.com/chicago-marathon-map";

describe("shared links", () => {
  it("writes the moment as HHMM, 24-hour Central Time, to the whole minute", () => {
    expect(formatShareTime(630)).toBe("1030");
    expect(formatShareTime(855)).toBe("1415");
    expect(formatShareTime(300)).toBe("0500");
    expect(formatShareTime(630.9)).toBe("1030");
    expect(shareHref(PAGE, 630, "columbus-dr-start-to-grand-ave")).toBe(`${PAGE}?t=1030&s=columbus-dr-start-to-grand-ave`);
  });

  it("round-trips every minute of the timeline", () => {
    for (let t = DAY_START; t <= DAY_END; t++) expect(parseShareTime(formatShareTime(t))).toBe(t);
  });

  it("round-trips every street through a whole link", () => {
    expect(new Set(SEGMENTS.map((s) => s.slug)).size).toBe(SEGMENTS.length);
    for (const seg of SEGMENTS) {
      const link = readShareLink(new URL(shareHref(PAGE, 600, seg.slug)).search);
      expect(link).toEqual({ t: 600, slug: seg.slug });
      expect(SEGMENTS.findIndex((s) => s.slug === link.slug)).toBe(seg.index);
    }
  });

  it("ignores a malformed or out-of-range time", () => {
    for (const bad of [null, "", "930", "09300", "0930x", " 1030", "10:30", "2400", "1060", "0459", "1901", "-100", "1e3", "１０３０"]) {
      expect(parseShareTime(bad)).toBeNull();
    }
    expect(parseShareTime("0500")).toBe(DAY_START);
    expect(parseShareTime("1900")).toBe(DAY_END);
  });

  it("ignores a malformed street", () => {
    for (const bad of [null, "", "Columbus-Dr", "columbus dr", "<script>", "a--b", "-a", "a-", "a_b", "x".repeat(121)]) {
      expect(parseShareSlug(bad)).toBeNull();
    }
  });

  it("reads each parameter on its own, so one bad parameter does not spoil the other", () => {
    expect(readShareLink("?t=1030&s=%3Cscript%3E")).toEqual({ t: 630, slug: null });
    expect(readShareLink("?t=9999&s=lasalle-dr-stockton-dr-to-fullerton-dr")).toEqual({ t: null, slug: "lasalle-dr-stockton-dr-to-fullerton-dr" });
    expect(readShareLink("")).toEqual({ t: null, slug: null });
    expect(readShareLink("?t=1030&t=1100")).toEqual({ t: 630, slug: null });
  });

  it("opens paused at a shared moment, even when Live would start", () => {
    const raceDay9am = new Date("2026-10-11T14:00:00Z");
    expect(initialClock(raceDay9am, false)).toMatchObject({ live: true });
    expect(initialClock(raceDay9am, false, 630)).toEqual({ t: 630, playing: false, speed: 5, live: false });
    expect(initialClock(new Date("2026-10-09T18:00:00Z"), false, null)).toEqual({ t: 350, playing: true, speed: 5, live: false });
  });
});
