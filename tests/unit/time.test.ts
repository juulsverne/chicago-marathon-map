import { describe, expect, it } from "vitest";
import { dateChip, dateMode } from "@/model/date-mode";
import { chicagoTime, formatClock, formatDuration, formatShort } from "@/model/time";

describe("formatting", () => {
  it("formats clock times like v1", () => {
    expect(formatClock(350)).toBe("5:50 AM");
    expect(formatClock(720)).toBe("12:00 PM");
    expect(formatClock(1080)).toBe("6:00 PM");
    expect(formatClock(572.6)).toBe("9:33 AM");
  });

  it("formats short pill times like v1", () => {
    expect(formatShort(360)).toBe("6a");
    expect(formatShort(572)).toBe("9:32a");
    expect(formatShort(1080)).toBe("6p");
  });

  it("formats durations like v1", () => {
    expect(formatDuration(55)).toBe("55m");
    expect(formatDuration(65)).toBe("1h 5m");
    expect(formatDuration(-3)).toBe("0m");
  });
});

describe("chicagoTime", () => {
  it("converts to Chicago's date and minutes after midnight", () => {
    expect(chicagoTime(new Date("2026-10-11T14:00:00Z"))).toEqual({ dateKey: "2026-10-11", minutes: 540 });
    expect(chicagoTime(new Date("2026-10-12T04:59:30Z"))).toEqual({ dateKey: "2026-10-11", minutes: 1439.5 });
  });
});

describe("dateMode", () => {
  const at = (iso: string) => dateMode(new Date(iso));

  it("counts down before race day", () => {
    expect(at("2026-10-09T23:00:00Z")).toEqual({ kind: "before", daysUntil: 2 });
    expect(dateChip(at("2026-10-09T23:00:00Z"))).toBe("Race day in 2 days");
    expect(dateChip(at("2026-10-10T15:00:00Z"))).toBe("Race day tomorrow");
  });

  it("offers Live from 4:00 AM and defaults to it from 5:00 AM to 7:00 PM", () => {
    expect(at("2026-10-11T08:59:00Z")).toMatchObject({ kind: "raceday", liveOffered: false, liveByDefault: false });
    expect(at("2026-10-11T09:30:00Z")).toMatchObject({ kind: "raceday", liveOffered: true, liveByDefault: false });
    expect(at("2026-10-11T14:00:00Z")).toMatchObject({ kind: "raceday", liveOffered: true, liveByDefault: true });
    expect(at("2026-10-12T00:00:00Z")).toMatchObject({ kind: "raceday", liveOffered: false, liveByDefault: false });
    expect(dateChip(at("2026-10-11T14:00:00Z"))).toBe("Race day today");
  });

  it("becomes a replay after race day", () => {
    expect(at("2026-10-12T05:01:00Z")).toEqual({ kind: "after" });
    expect(dateChip({ kind: "after" })).toBe("Race day replay · Oct 11, 2026");
  });

  it("switches days at Chicago midnight, not UTC midnight", () => {
    expect(at("2026-10-11T04:59:59Z")).toEqual({ kind: "before", daysUntil: 1 });
    expect(at("2026-10-11T05:00:00Z")).toEqual({
      kind: "raceday",
      minutes: 0,
      liveOffered: false,
      liveByDefault: false,
    });
    expect(at("2026-10-12T04:59:59Z")).toMatchObject({ kind: "raceday", liveOffered: false, liveByDefault: false });
    expect(at("2026-10-12T05:00:00Z")).toEqual({ kind: "after" });
  });

  it("includes the Live edges: offered at exactly 4:00 AM, default at exactly 5:00 AM, both through 6:59 PM", () => {
    expect(at("2026-10-11T09:00:00Z")).toMatchObject({ kind: "raceday", liveOffered: true, liveByDefault: false });
    expect(at("2026-10-11T10:00:00Z")).toMatchObject({ kind: "raceday", liveOffered: true, liveByDefault: true });
    expect(at("2026-10-11T23:59:00Z")).toMatchObject({ kind: "raceday", liveOffered: true, liveByDefault: true });
  });
});
