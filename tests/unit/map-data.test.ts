import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import mapdata from "../../data/source/mapdata.json";
import svg from "@/data/course-svg.json";
import { LANDMARKS } from "@/content/landmarks";
import type { FeatureCollection } from "@/lib/build-data";
import { decode, flatDistance, type LatLng, type MapData } from "@/lib/geo/decode";
import { joinSegments } from "@/lib/geo/join";
import { MILE, pointAt } from "@/model/course";

// Read with fs, not import: streets.json is 860 KB and would slow the module transform.
const geojson = (name: string) => JSON.parse(readFileSync(`public/data/${name}.json`, "utf8")) as FeatureCollection;
const [streets, course, labels, lake, parks, rivers, miles] = ["streets", "course", "labels", "lake", "parks", "rivers", "miles"].map(geojson);
const line = (fc: FeatureCollection, i: number) => fc.features[i].geometry.coordinates as number[][];
const toLatLng = ([lng, lat]: number[]): LatLng => [lat, lng];
const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;
const numbers = (value: unknown): number[] => (Array.isArray(value) ? value.flatMap(numbers) : typeof value === "number" ? [value] : []);
const raw = (mapdata as unknown as MapData).course.map(decode);

describe("map GeoJSON", () => {
  it("has all 4,292 street lines, by class, with their names", () => {
    expect(streets.features).toHaveLength(4292);
    const byClass = [0, 1, 2, 3].map((c) => streets.features.filter((f) => f.properties.class === c).length);
    expect(byClass).toEqual([38, 144, 267, 3843]);
    expect(streets.features.filter((f) => "name" in f.properties)).toHaveLength(4254);
  });

  it("has 41 course segments with numeric ids 0 to 40, in race order", () => {
    expect(course.features.map((f) => f.id)).toEqual(Array.from({ length: 41 }, (_, i) => i));
    expect(flatDistance(toLatLng(line(course, 0)[0]), pointAt(0))).toBeLessThan(1);
  });

  it("draws the course with every segment ending where the next one starts", () => {
    for (let i = 0; i < 40; i++) {
      const a = line(course, i);
      const b = line(course, i + 1);
      expect(flatDistance(toLatLng(a[a.length - 1]), toLatLng(b[0])), `segments ${i} and ${i + 1}`).toBeLessThan(1);
    }
  });

  it("bridges v1's one real course gap, between segments 8 and 9, and changes nothing else", () => {
    expect(flatDistance(raw[8][raw[8].length - 1], raw[9][0])).toBeGreaterThan(50);
    const joined = joinSegments(raw);
    expect(joined[8]).toEqual([...raw[8], raw[9][0]]);
    expect(joined.filter((l, i) => l.length !== raw[i].length)).toHaveLength(1);
  });

  it("labels 23 neighborhoods (10 of them minor) and the landmarks, with Lake Michigan named once", () => {
    expect(LANDMARKS.filter((l) => l.name === "Lake Michigan")).toHaveLength(1);
    expect(labels.features.filter((f) => f.properties.kind === "hood")).toHaveLength(23);
    expect(labels.features).toHaveLength(23 + LANDMARKS.length);
    expect(labels.features.filter((f) => f.properties.minor)).toHaveLength(10);
  });

  it("marks 26 miles beside the route, plus the start and the finish", () => {
    const mileFeatures = miles.features.filter((f) => f.properties.kind === "mile");
    expect(mileFeatures.map((f) => f.properties.mile)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(flatDistance(toLatLng(mileFeatures[12].geometry.coordinates as number[]), pointAt(13 * MILE))).toBeLessThan(1);
    for (const f of mileFeatures) expect(Math.hypot(...(f.properties.offset as number[]))).toBeCloseTo(1.4, 1);
    expect(miles.features.filter((f) => f.properties.kind !== "mile").map((f) => f.properties.label)).toEqual(["Start", "Finish"]);
  });

  it("keeps the water and park layers", () => {
    expect(lake.features).toHaveLength(2);
    expect(parks.features).toHaveLength(2);
    expect(rivers.features).toHaveLength(14);
  });

  it("stores coordinates with at most 5 decimals", () => {
    for (const fc of [streets, course, labels, lake, parks, rivers, miles]) {
      expect(fc.features.flatMap((f) => numbers(f.geometry.coordinates)).every((n) => decimals(n) <= 5)).toBe(true);
    }
  });
});

describe("SVG data", () => {
  const coords = (d: string) => d.match(/-?[\d.]+/g)!.map(Number);

  it("draws the same continuous course as the map", () => {
    expect(svg.course).toHaveLength(41);
    for (let i = 0; i < 40; i++) {
      const a = coords(svg.course[i]);
      const b = coords(svg.course[i + 1]);
      expect(Math.hypot(a[a.length - 2] - b[0], a[a.length - 1] - b[1]), `segments ${i} and ${i + 1}`).toBeLessThan(0.5);
    }
  });

  it("clips the lake, parks and rivers to what a 21:9 screen can show", () => {
    const { clip } = svg;
    for (const d of [...svg.lake, ...svg.parks, ...svg.rivers]) {
      const n = coords(d);
      for (let k = 0; k < n.length; k += 2) {
        expect(n[k]).toBeGreaterThanOrEqual(clip.minX - 0.05);
        expect(n[k]).toBeLessThanOrEqual(clip.maxX + 0.05);
        expect(n[k + 1]).toBeGreaterThanOrEqual(clip.minY - 0.05);
        expect(n[k + 1]).toBeLessThanOrEqual(clip.maxY + 0.05);
      }
    }
    expect(JSON.stringify({ lake: svg.lake, parks: svg.parks, rivers: svg.rivers }).length).toBeLessThan(20_000);
  });
});
