import { describe, expect, it } from "vitest";
import * as events from "@/content/events";
import * as facts from "@/content/facts";
import * as raceDay from "@/content/race-day";
import * as records from "@/content/records";
import * as results from "@/content/results";
import { SOURCES, sourceById, type SourceId } from "@/content/sources";
import * as streets from "@/content/streets";
import { FIELD } from "@/content/race";
import { formatPeople } from "@/model/runners";

const modules = { events, facts, raceDay, records, results, streets };

/** Every object in the content modules that carries a `sources` array. */
function sourcedItems(value: unknown, path: string, out: { path: string; sources: unknown }[] = []) {
  if (Array.isArray(value)) value.forEach((v, i) => sourcedItems(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    if ("sources" in value) out.push({ path, sources: (value as { sources: unknown }).sources });
    for (const [k, v] of Object.entries(value)) if (k !== "sources") sourcedItems(v, `${path}.${k}`, out);
  }
  return out;
}

/** Every string in the content modules, including what the copy functions return for sample input. */
function allText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    try {
      return allText((value as (...a: unknown[]) => unknown)("X", "Y", 3));
    } catch {
      return []; // a lookup that rejects sample input returns content listed elsewhere
    }
  }
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === "object") return Object.values(value).flatMap(allText);
  return [];
}

describe("sources", () => {
  it("lists all 31 sources with unique ids and https links", () => {
    expect(SOURCES).toHaveLength(31);
    expect(SOURCES.map((s) => s.id)).toEqual(Array.from({ length: 31 }, (_, i) => `S${i + 1}`));
    for (const s of SOURCES) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.publisher.length).toBeGreaterThan(3);
      expect(s.date).toMatch(/^(accessed )?\d{4}-\d{2}-\d{2}/);
    }
    expect(sourceById("S1").publisher).toBe("Bank of America Chicago Marathon");
  });

  it("gives every sourced claim at least one known source", () => {
    const items = sourcedItems(modules, "content");
    expect(items.length).toBeGreaterThan(40);
    const known = new Set<string>(SOURCES.map((s) => s.id));
    for (const { path, sources } of items) {
      expect(Array.isArray(sources) && sources.length > 0, `${path} needs a source`).toBe(true);
      for (const id of sources as SourceId[]) expect(known.has(id), `${path}: unknown source ${id}`).toBe(true);
    }
  });

  it("sources every event, record, fact tile and race-week line", () => {
    for (const list of [events.EVENTS, records.RECORD_BOOK, records.WORLD_RECORDS, facts.FACT_TILES, facts.RACE_WEEK, facts.WATCH.lines, raceDay.LANES.filter((l) => l.tone !== "you")]) {
      for (const item of list as readonly { sources?: readonly string[] }[]) expect(item.sources?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("corrected claims", () => {
  const text = allText(modules).join("\n");

  it("drops every claim found wrong or unsourced", () => {
    for (const gone of ["53,000", "$207M", "106,000", "$680M", "1 in 3", "Chicago median", "crews clear", "city's closure notice", "Fullerton Pkwy to Sheridan", "previews the downtown course", "4,200 runners started"]) {
      expect(text, gone).not.toContain(gone);
    }
  });

  it("starts Wave 1 at 7:35, after the pros at 7:30", () => {
    expect(raceDay.WAVES_COPY.rows[0]).toEqual({ wave: "Wave 1", at: "7:35 AM", note: "right after the pros" });
    expect(events.EVENTS.find((e) => e.t === 450)?.detail).toBe(
      "The pros leave Grant Park; the High Performance Program follows at 7:32 and Wave 1 at 7:35. Wave 2 goes at 8:00, Wave 3 at 8:35.",
    );
    expect(raceDay.STORY.wheelchair.sub).toBe("Men started at 7:20, women at 7:21. The pros go at 7:30, Wave 1 at 7:35.");
  });

  it("uses the 55,000 field everywhere it names one", () => {
    expect(raceDay.FIELD_COPY.title).toBe(`Where the ${formatPeople(FIELD)} are`);
    expect(raceDay.FIELD_COPY.body.future).toBe(
      "More than 55,000 runners from all 50 states and more than 130 countries are expected on the course in 2026. The model starts 55,000 runners in three waves.",
    );
  });

  it("puts the typical runner at the average finish, about 4:20", () => {
    expect(raceDay.AVERAGE_FINISH).toBe(260);
    expect(raceDay.LANES.find((l) => l.tone === "typical")).toMatchObject({ name: "Typical runner", sub: "about 4:20 (average finish)", finish: 260 });
  });

  it("labels the women's world record as set in a mixed race, with the ban in context", () => {
    expect(records.RECORD_BOOK[1]).toMatchObject({ time: "2:09:56", title: "Women's world record (mixed race)" });
    expect(records.RECORDS_COPY.chepngetichNote).toContain("banned for three years in October 2025");
  });

  it("updates the charity, economic and visitor figures", () => {
    expect(facts.FACT_TILES.map((f) => f.value)).toEqual(["1977", "200,000+", "1905", "0.2 mi", "35 km", "88°F", "6.5 hrs", "75%+", "$405M+", "$756M"]);
  });

  it("explains how streets reopen the way the organizer does", () => {
    expect(streets.STREETS_COPY.lifecycle.body).toBe(
      "Course streets close at about 6:00 AM, stay closed while runners pass, then reopen as the last runners pass (15-minute-mile pace), on Chicago Police's call.",
    );
  });

  it("keeps the results slot empty until the race is run", () => {
    expect(results.RESULTS).toBeNull();
  });
});
