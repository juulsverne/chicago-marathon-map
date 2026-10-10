import { describe, expect, it } from "vitest";
import mapdata from "../../data/source/mapdata.json";
import { decode, flatDistance, haversine, type MapData } from "@/lib/geo/decode";

const data = mapdata as unknown as MapData;

describe("v1 source data", () => {
  it("has every layer v1 shipped", () => {
    expect(data.names).toHaveLength(1073);
    expect(data.streets).toHaveLength(4292);
    expect(data.course).toHaveLength(41);
    expect(data.lake).toHaveLength(2);
    expect(data.parks).toHaveLength(2);
    expect(data.rivers).toHaveLength(14);
    expect(data.hoods).toHaveLength(23);
  });

  it("decodes the course start on Columbus Drive in Grant Park", () => {
    const [lat, lng] = decode(data.course[0])[0];
    expect(lat).toBeCloseTo(41.88087, 5);
    expect(lng).toBeCloseTo(-87.62079, 5);
  });
});

describe("decode", () => {
  it("accumulates (lng, lat) deltas scaled by 1e5 into [lat, lng]", () => {
    const [a, b] = decode([100, 200, 1, -1]);
    expect(a[0]).toBeCloseTo(0.002, 10);
    expect(a[1]).toBeCloseTo(0.001, 10);
    expect(b[0]).toBeCloseTo(0.00199, 10);
    expect(b[1]).toBeCloseTo(0.00101, 10);
  });
});

describe("distances", () => {
  it("agree within 0.1% over a downtown block", () => {
    const a: [number, number] = [41.8781, -87.6298];
    const b: [number, number] = [41.8827, -87.6233];
    expect(flatDistance(a, b) / haversine(a, b)).toBeCloseTo(1, 3);
  });
});
