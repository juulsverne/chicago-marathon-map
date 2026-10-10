import { describe, expect, it } from "vitest";
import { segmentBounds } from "@/map/camera";
import { ROUTE_CUM, ROUTE_POINTS, SEGMENTS } from "@/model/course";
import { cardEyebrow, cardSentence, detailRows, statusLine } from "@/ui/card/card-view";

const columbus = SEGMENTS[0];
const finish = SEGMENTS[40];

describe("street card", () => {
  it("writes the status line for closed and open streets", () => {
    expect(statusLine(columbus, 575)).toEqual({ closed: true, text: "Closed until ~10:30 AM CT · reopens in 55m" });
    expect(statusLine(columbus, 350)).toEqual({ closed: false, text: "Open now · closes at 6:00 AM CT, in 10m" });
    expect(statusLine(columbus, 640)).toEqual({ closed: false, text: "Open again since ~10:30 AM CT" });
    expect(statusLine(finish, 900)).toEqual({ closed: true, text: "Closed Thu Oct 8, 6:00 AM to Mon Oct 12, 3:00 PM CT" });
  });

  it("adds v1's explanation only where it says more than the status line", () => {
    expect(cardSentence(columbus, 350, 0)).toBeNull(); // open: the status line says it all
    expect(cardSentence(columbus, 460, 12)).toBe("The race is passing through right now. Reopens at 10:30 AM CT.");
    expect(cardSentence(columbus, 640, 0)).toBeNull();
    expect(cardSentence(finish, 900, 0)).toBeNull();
    expect(cardSentence(finish, 600, 4)).toBe("Runners are finishing right now.");
  });

  it("names the neighborhood and the mile span", () => {
    expect(cardEyebrow(columbus)).toBe("Grant Park & the Loop · miles 0.0–0.7");
    expect(cardEyebrow(finish)).toBe("Bronzeville & the finish · miles 25.8–26.2");
  });

  it("lists the closure and runner times, modeled ones with ~", () => {
    expect(detailRows(columbus)).toEqual([
      { label: "Closes", value: "6:00 AM" },
      { label: "Reopens", value: "~10:30 AM" },
      { label: "Wheelchair leaders", value: "~7:20 AM" },
      { label: "Elite runners", value: "~7:30 AM" },
      { label: "Biggest crowd", value: expect.stringMatching(/^~8:\d\d AM$/) },
      { label: "Last runners", value: expect.stringMatching(/^~9:\d\d AM$/) },
    ]);
    expect(detailRows(finish).slice(0, 2)).toEqual([
      { label: "Closed", value: "Thu Oct 8, 6:00 AM" },
      { label: "Reopens", value: "Mon Oct 12, 3:00 PM" },
    ]);
  });
});

describe("segmentBounds", () => {
  it("frames a segment's ends and every route point between them", () => {
    const seg = SEGMENTS[21]; // Adams St, Wacker Dr to Damen Ave: a long straight run west
    const [[west, south], [east, north]] = segmentBounds(21);
    ROUTE_POINTS.forEach(([lat, lng], i) => {
      if (ROUTE_CUM[i] <= seg.d0 || ROUTE_CUM[i] >= seg.d1) return;
      expect(lng).toBeGreaterThanOrEqual(west);
      expect(lng).toBeLessThanOrEqual(east);
      expect(lat).toBeGreaterThanOrEqual(south);
      expect(lat).toBeLessThanOrEqual(north);
    });
    expect(east - west).toBeGreaterThan(0.03); // about 2 miles of longitude
    expect(north - south).toBeLessThan(0.002);
  });
});
