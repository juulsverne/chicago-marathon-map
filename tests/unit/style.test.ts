import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { describe, expect, it } from "vitest";
import { MAP_DATA_FILES } from "@/lib/build-data";
import { MAP_FONTS } from "@/map/assets";
import { DAY } from "@/map/palette";
import { DATA_BOUNDS } from "@/map/camera";
import { COURSE_SOURCE, FRAME_SOURCE, MAP_SOURCES, RUNNER_BEFORE_LAYER, buildStyle, frameData } from "@/map/style";

const ORIGIN = "https://lab.elijahos.com";
const style = buildStyle({ origin: ORIGIN, palette: DAY });
const ids = style.layers.map((l) => l.id);
const json = JSON.stringify(style);

describe("map style", () => {
  it("is a valid MapLibre style", () => {
    expect(validateStyleMin(style)).toEqual([]);
  });

  it("loads only our own data and fonts, with no glyph server or sprite", () => {
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    // Our data files, plus the surround, which is built in code and fetches nothing.
    expect(Object.keys(style.sources)).toEqual([...MAP_SOURCES, FRAME_SOURCE]);
    expect(MAP_SOURCES).toEqual(MAP_DATA_FILES); // the files npm run build:data writes
    for (const s of MAP_SOURCES) {
      expect((style.sources[s] as { data: string }).data).toMatch(/^https:\/\/lab\.elijahos\.com\/chicago-marathon-map\/data\/[a-z]+\.json$/);
    }
    expect(typeof (style.sources[FRAME_SOURCE] as { data: unknown }).data).toBe("object");
    for (const url of Object.values(style["font-faces"] ?? {})) {
      expect(url).toMatch(/^https:\/\/lab\.elijahos\.com\/chicago-marathon-map\/vendor\/fonts\/.+\.woff2$/);
    }
  });

  it("fades the map into a surround at the edge of its data, over the streets and under the course", () => {
    const at = (id: string) => ids.indexOf(id);
    expect(at("frame")).toBeGreaterThan(at("street-labels-major"));
    expect(at("frame")).toBeLessThan(at("hood-labels"));
    const { features } = frameData();
    // The world outside the data box at full strength, its hole exactly the box.
    const [[w, s], [e, n]] = DATA_BOUNDS;
    expect(features[0].properties.o).toBe(1);
    expect(features[0].geometry.coordinates[1]).toEqual([[w, s], [w, n], [e, n], [e, s], [w, s]]);
    // Then rings that thin out toward the middle, each one's hole the next one's outline.
    const fade = features.slice(1).map((f) => f.properties.o);
    expect(fade.length).toBeGreaterThanOrEqual(10);
    fade.forEach((o, i) => expect(o).toBeLessThan(i ? fade[i - 1] : 1));
    features.slice(1, -1).forEach((f, i) => {
      const hole = f.geometry.coordinates[1];
      const next = features[i + 2].geometry.coordinates[0];
      expect(next.map(([x, y]) => `${x},${y}`).sort()).toEqual(hole.map(([x, y]) => `${x},${y}`).sort());
    });
  });

  it("declares a font face for every font a label uses", () => {
    const faces = new Set(Object.keys(style["font-faces"] ?? {}));
    const used = style.layers.flatMap((l) => (l.type === "symbol" ? ((l.layout?.["text-font"] as string[]) ?? []) : []));
    expect(used.length).toBeGreaterThan(0);
    for (const f of used) expect(faces.has(f)).toBe(true);
    expect(faces.size).toBe(Object.keys(MAP_FONTS).length);
  });

  it("stacks water, streets, the course, then labels", () => {
    const at = (id: string) => ids.indexOf(id);
    expect(ids[0]).toBe("background");
    expect(at("street-fill-0")).toBeLessThan(at("course-casing"));
    expect(at("course-halo")).toBeLessThan(at("course-casing"));
    expect(at("course-casing")).toBeLessThan(at("course-line"));
    expect(at(RUNNER_BEFORE_LAYER)).toBe(at("course-line") + 1);
    const firstSymbol = style.layers.findIndex((l) => l.type === "symbol");
    expect(ids[firstSymbol]).toBe(RUNNER_BEFORE_LAYER);
  });

  it("keeps labels off the course with an invisible guard placed before them", () => {
    const at = (id: string) => ids.indexOf(id);
    const guard = style.layers.find((l) => l.id === "course-label-guard");
    expect(guard && guard.type === "symbol" && guard.source).toBe(COURSE_SOURCE);
    expect(guard?.paint).toEqual({ "text-opacity": 0 }); // never drawn
    expect(guard?.type === "symbol" && guard.layout?.["text-allow-overlap"]).toBe(true);
    // Symbol layers are placed from the end of the list, so the guard claims its space
    // before every label listed before it, and after the mile markers and start/finish tags.
    for (const id of ["street-labels-local", "street-labels-secondary", "street-labels-major", "hood-labels", "park-labels", "water-labels"]) {
      expect(at(id), id).toBeLessThan(at("course-label-guard"));
    }
    expect(at("mile-labels")).toBeGreaterThan(at("course-label-guard"));
    expect(at("start-finish")).toBeGreaterThan(at("course-label-guard"));
  });

  it("colors course segments from the tweened `closed` feature-state", () => {
    const line = style.layers.find((l) => l.id === "course-line");
    expect(line && "source" in line && line.source).toBe(COURSE_SOURCE);
    expect(JSON.stringify(line)).toContain('["feature-state","closed"]');
    expect(JSON.stringify(line)).toContain(DAY.closed);
    expect(JSON.stringify(line)).toContain(DAY.open);
  });

  it("reserves `selected` and `hover` feature-states for the course halo", () => {
    const halo = JSON.stringify(style.layers.find((l) => l.id === "course-halo"));
    expect(halo).toContain('["feature-state","selected"]');
    expect(halo).toContain('["feature-state","hover"]');
  });

  it("uses palette colors only", () => {
    const colors = new Set(json.match(/#[0-9a-f]{6}/gi));
    const palette = new Set(Object.values(DAY).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v))));
    for (const c of colors) expect(palette.has(c)).toBe(true);
  });
});
