import { describe, expect, it } from "vitest";
import { AREAS, CLOSURES, areaOf, closureSlug } from "@/content/closures";
import { COPY } from "@/content/copy";
import { DOCK_EVENTS, EVENTS } from "@/content/events";
import { GUN, LEADERS, WAVES, leader } from "@/content/race";

describe("closures", () => {
  it("lists all 41 course streets in race order", () => {
    expect(CLOSURES).toHaveLength(41);
    expect(CLOSURES[0]).toEqual({ street: "Columbus Dr", range: "Start to Grand Ave", reopensAt: 630 });
    expect(CLOSURES[40]).toEqual({ street: "Columbus Dr", range: "Roosevelt Rd to the finish", reopensAt: null });
  });

  it("reopens streets in race order, with only the finish area held over", () => {
    const times = CLOSURES.slice(0, 40).map((c) => c.reopensAt as number);
    expect(times.every((t, i) => i === 0 || t >= times[i - 1])).toBe(true);
    expect(CLOSURES.filter((c) => c.reopensAt === null)).toHaveLength(1);
  });

  it("gives every closure a unique, readable slug", () => {
    const slugs = CLOSURES.map(closureSlug);
    expect(new Set(slugs).size).toBe(41);
    expect(slugs[0]).toBe("columbus-dr-start-to-grand-ave");
    expect(slugs[40]).toBe("columbus-dr-roosevelt-rd-to-the-finish");
  });

  // Source S1: rows 6 to 8 of the organizer's notice name LaSalle Dr and Fullerton Dr.
  it("uses the notice's street names for rows 6 to 8", () => {
    expect(CLOSURES.slice(5, 8)).toEqual([
      { street: "Stockton Dr", range: "LaSalle Dr to Fullerton Dr", reopensAt: 720 },
      { street: "Fullerton Dr", range: "Stockton Dr to Cannon Dr", reopensAt: 720 },
      { street: "Cannon Dr", range: "Fullerton Dr to Sheridan Rd", reopensAt: 720 },
    ]);
    expect(CLOSURES.slice(5, 8).map(closureSlug)).toEqual([
      "stockton-dr-lasalle-dr-to-fullerton-dr",
      "fullerton-dr-stockton-dr-to-cannon-dr",
      "cannon-dr-fullerton-dr-to-sheridan-rd",
    ]);
  });

  it("groups every closure into exactly one neighborhood area", () => {
    expect(AREAS).toHaveLength(6);
    for (let i = 0; i < 41; i++) expect(areaOf(i)).toBeGreaterThanOrEqual(0);
    expect(areaOf(0)).toBe(0);
    expect(areaOf(40)).toBe(5);
  });
});

describe("race", () => {
  // Sources S4 and S3: the pros go at 7:30 and Wave 1 at 7:35.
  it("starts three waves at 7:35, 8:00 and 8:35, after the 7:30 gun", () => {
    expect(GUN).toBe(450);
    expect(WAVES.map((w) => w.start)).toEqual([455, 480, 515]);
  });

  it("tracks six leaders and shows the world-record ghost by default", () => {
    expect(LEADERS.map((l) => l.id)).toEqual(["wcm", "wcw", "men", "wom", "wr", "you"]);
    expect(leader("wr").shownByDefault).toBe(true);
    expect(leader("you").shownByDefault).toBe(false);
    expect(leader("men").T).toBe(122.5);
  });
});

describe("events", () => {
  it("lists nine events in time order, five of them on the timeline", () => {
    expect(EVENTS).toHaveLength(9);
    expect(EVENTS.every((e, i) => i === 0 || e.t >= EVENTS[i - 1].t)).toBe(true);
    expect(DOCK_EVENTS.map((e) => e.dock.short)).toEqual(["6:00a", "7:30a", "~9:32a", "~3:20p", "6:00p"]);
  });

  it("shows the same five events, word for word, on the dock and in the agenda", () => {
    const agendaDock = EVENTS.filter((e) => e.dock !== undefined).map(({ t, at, name, dock }) => ({ t, at, name, dock }));
    expect(agendaDock).toEqual(DOCK_EVENTS);
    expect(EVENTS.every((e) => e.detail.length > 0)).toBe(true);
  });
});

// WCAG 2.5.3, Label in Name (Level A): a control's accessible name contains its visible text.
describe("accessible names", () => {
  const visible = (...parts: string[]) => parts.join(" ");

  it("names each moment pill after what it shows, then explains it", () => {
    const names = DOCK_EVENTS.map((m) => COPY.momentLabel(m));
    expect(names).toEqual([
      "6:00a Streets close: 6:00 AM CT, streets close",
      "7:30a Race starts: 7:30 AM CT, the race starts",
      "~9:32a First finisher: about 9:32 AM CT, first runner finishes",
      "~3:20p Last finisher: about 3:20 PM CT, last runners finish",
      "6:00p All streets open: 6:00 PM CT, last street reopens",
    ]);
    DOCK_EVENTS.forEach((m, i) => expect(names[i].startsWith(visible(m.dock.short, m.dock.label))).toBe(true));
  });

  it("names the speed button after what it shows, then explains it", () => {
    expect([1, 5, 15].map(COPY.speedLabel)).toEqual([
      "Per second 1 min: playback speed, one second equals 1 minute of race day. Tap to change.",
      "Per second 5 min: playback speed, one second equals 5 minutes of race day. Tap to change.",
      "Per second 15 min: playback speed, one second equals 15 minutes of race day. Tap to change.",
    ]);
    for (const speed of [1, 5, 15]) {
      expect(COPY.speedLabel(speed).startsWith(visible(COPY.speedUnit, COPY.speedValue(speed)))).toBe(true);
    }
  });
});
