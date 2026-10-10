import { afterEach, describe, expect, it, vi } from "vitest";
import { MLAT, MLNG, flatDistance } from "@/lib/geo/decode";
import { DATA_BOUNDS } from "@/map/camera";
import { ROUTE_LEN, SEGMENTS, pointAt } from "@/model/course";
import { MILE_METRES, RACE_AREA, distanceText, inRaceArea, nearestClosure, walkMinutes } from "@/model/nearest";

/** A point `metres` east of a point along the route. */
const eastOf = (d: number, metres: number): [number, number] => {
  const [lat, lng] = pointAt(d);
  return [lat, lng + metres / MLNG];
};

describe("nearest closure", () => {
  it("uses the map's data box as the race area", () => {
    expect([[RACE_AREA.west, RACE_AREA.south], [RACE_AREA.east, RACE_AREA.north]]).toEqual(DATA_BOUNDS);
    expect(inRaceArea([41.88, -87.63])).toBe(true);
    expect(inRaceArea([40.71, -74.0])).toBe(false); // New York
  });

  it("finds the segment under a pin on the course, at no distance", () => {
    const seg = SEGMENTS[21];
    const d = (seg.d0 + seg.d1) / 2;
    const near = nearestClosure(pointAt(d));
    expect(near.kind).toBe("near");
    if (near.kind !== "near") return;
    expect(near.index).toBe(21);
    expect(near.distance).toBeLessThan(0.5);
    expect(Math.abs(near.along - d)).toBeLessThan(1);
  });

  it("measures the distance to the nearest point and returns that point", () => {
    // Adams St runs nearly due east-west, so 120 m north of its middle is about 120 m from it.
    const seg = SEGMENTS[21];
    const [lat, lng] = pointAt((seg.d0 + seg.d1) / 2);
    const near = nearestClosure([lat + 120 / MLAT, lng]);
    expect(near.kind).toBe("near");
    if (near.kind !== "near") return;
    expect(near.index).toBe(21);
    expect(near.distance).toBeCloseTo(120, 0);
    expect(flatDistance(near.point, [lat, lng])).toBeLessThan(10); // the street is not quite due east-west
  });

  it("says when nothing closes within a mile, and when a spot is outside the race area", () => {
    expect(nearestClosure([41.7, -87.75]).kind).toBe("far");
    const far = nearestClosure(eastOf(0, MILE_METRES * 1.5));
    expect(far.kind === "far" || far.kind === "outside").toBe(true);
    expect(nearestClosure([40.71, -74.0])).toEqual({ kind: "outside" });
  });

  it("lists up to three other nearby closures, on other streets, nearest first", () => {
    // Near the start and the finish: Columbus Dr's two segments share a name, so one is not "other".
    const near = nearestClosure(eastOf(ROUTE_LEN - 300, 150));
    expect(near.kind).toBe("near");
    if (near.kind !== "near") return;
    expect(near.others.length).toBeLessThanOrEqual(3);
    for (const o of near.others) {
      expect(o.distance).toBeLessThan(900);
      expect(SEGMENTS[o.index].street).not.toBe(SEGMENTS[near.index].street);
    }
    expect(near.others.map((o) => o.distance)).toEqual([...near.others.map((o) => o.distance)].sort((a, b) => a - b));
  });

  it("writes distances and walking times like v1", () => {
    expect(distanceText(100)).toBe("330 ft");
    expect(distanceText(400)).toBe("0.25 mi");
    expect(walkMinutes(30)).toBe(1);
    expect(walkMinutes(400)).toBe(5);
  });
});

describe("the pinned spot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reads only well-formed saved pins", async () => {
    const { parsePin } = await import("@/ui/spot");
    expect(parsePin("[41.8781,-87.6298]")).toEqual([41.8781, -87.6298]);
    for (const bad of [null, "", "nope", "[1]", '["41", "-87"]', "[91, 0]", "[0, 181]", "{}", "[NaN, 1]"]) expect(parsePin(bad)).toBeNull();
  });

  it("keeps the pin in this browser, and survives storage that throws", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    const { setPin, spot } = await import("@/ui/spot");
    setPin([41.88, -87.63]);
    expect(store.get("cm-pin")).toBe("[41.88,-87.63]");
    expect(spot.get()).toMatchObject({ pin: [41.88, -87.63], from: "map", picking: false });
    setPin(null);
    expect(store.has("cm-pin")).toBe(false);

    vi.resetModules();
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    const blocked = await import("@/ui/spot");
    expect(blocked.spot.get().pin).toBeNull();
    expect(() => blocked.setPin([41.9, -87.64])).not.toThrow();
    expect(blocked.spot.get().pin).toEqual([41.9, -87.64]);
  });

  it("uses one location fix, and explains a refusal", async () => {
    const { locate, spot } = await import("@/ui/spot");
    const geo = {
      getCurrentPosition: vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 41.885, longitude: -87.62 } } as GeolocationPosition)),
    } as unknown as Geolocation;
    locate(geo);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(spot.get()).toMatchObject({ pin: [41.885, -87.62], from: "location", locating: "idle" });

    const refusing = {
      getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) => fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    } as unknown as Geolocation;
    locate(refusing);
    expect(spot.get().locating).toBe("denied");
    locate(undefined);
    expect(spot.get().locating).toBe("unavailable");
  });
});
