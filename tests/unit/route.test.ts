import { describe, expect, it } from "vitest";
import mapdata from "../../data/source/mapdata.json";
import { decode, haversine, type MapData } from "@/lib/geo/decode";
import { buildRoute } from "@/lib/geo/route";

const data = mapdata as unknown as MapData;
const route = buildRoute(data.course.map(decode));

describe("buildRoute", () => {
  it("joins 41 segments into one 244-point route", () => {
    expect(route.points).toHaveLength(244);
    expect(route.cum).toHaveLength(244);
    expect(route.cum[0]).toBe(0);
    expect(route.segments).toHaveLength(41);
  });

  it("measures 43,419 m along street centerlines", () => {
    let geodesic = 0;
    for (let i = 1; i < route.points.length; i++) geodesic += haversine(route.points[i - 1], route.points[i]);
    expect(Math.abs(geodesic - 43419)).toBeLessThan(5);
    expect(Math.abs(route.len - 43419.37)).toBeLessThan(0.01);
  });

  it("lays segments end to end across the whole route", () => {
    expect(route.segments[0].d0).toBe(0);
    expect(route.segments[40].d1).toBeCloseTo(route.len, 6);
    for (let i = 1; i < 41; i++) expect(route.segments[i].d0).toBeCloseTo(route.segments[i - 1].d1, 6);
  });
});
