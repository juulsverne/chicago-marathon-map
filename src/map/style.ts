import type { ExpressionSpecification, GeoJSONSourceSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import { COPY } from "@/content/copy";
import { FONT_DIR, MAP_FONTS, assetUrl, type MapFont } from "./assets";
import { DATA_BOUNDS } from "./camera";
import { COURSE_METERS, COURSE_MIN_PX, widthExpression } from "./lane";
import type { MapPalette } from "./palette";

// The MapLibre style, built in code from our own GeoJSON and palette: no tiles, no
// glyph server, no sprite, so the map makes no third-party requests. Zooms are
// MapLibre zooms (v1's Leaflet zoom minus one, see lane.ts).

export const COURSE_SOURCE = "course";
/** The runner layer goes directly below this layer: above the course, below every label. */
export const RUNNER_BEFORE_LAYER = "street-labels-local";
/** Must list the files npm run build:data writes (tests/unit/style.test.ts checks). */
export const MAP_SOURCES = ["streets", "lake", "parks", "rivers", "labels", "course", "miles"] as const;

/** Feature-state keys on course segments. `closed` runs from 0 (open) to 1 (closed)
 *  and is tweened by the engine, because MapLibre does not animate feature-state
 *  changes. `selected` and `hover` follow the selected street and the pointer. */
export type CourseState = { closed?: number; selected?: boolean; hover?: boolean };

const font = (f: MapFont): string[] => [MAP_FONTS[f].face];
const state = (key: "selected" | "hover"): ExpressionSpecification => ["boolean", ["feature-state", key], false];
const kind = (k: string): ExpressionSpecification => ["==", ["get", "kind"], k];

// v1's street widths: [metres, minimum px] per class (0 expressways .. 3 local streets).
const STREET_WIDTHS: readonly (readonly [number, number])[] = [
  [26, 2.2],
  [17, 1.4],
  [13, 1],
  [9, 0.45],
];
const CASING_PX = 1.5; // v1 added 1 px below Leaflet zoom 14 and 2 px above

/** The inline source for the surround: the map's data stops at DATA_BOUNDS. */
export const FRAME_SOURCE = "frame";
// How far in from the data box's edge the map fades into the surround (about 5 km each way,
// short of the course), and in how many rings: enough that no band shows.
const FADE_DEG = [0.06, 0.045] as const;
const FADE_RINGS = 12;

/** The world outside the data box at full strength, then rings inside the box's edge
 *  that thin out toward the middle, so the streets and the lake fade into the surround
 *  instead of stopping at a straight line. Outer rings run counterclockwise and holes
 *  clockwise, which is how MapLibre tells them apart. */
type FrameFeature = { type: "Feature"; properties: { o: number }; geometry: { type: "Polygon"; coordinates: number[][][] } };

export function frameData(): { type: "FeatureCollection"; features: FrameFeature[] } {
  const [[w, s], [e, n]] = DATA_BOUNDS;
  const box = (i: number) => {
    const dx = (FADE_DEG[0] * i) / FADE_RINGS;
    const dy = (FADE_DEG[1] * i) / FADE_RINGS;
    return { w: w + dx, s: s + dy, e: e - dx, n: n - dy };
  };
  const ccw = (b: ReturnType<typeof box>) => [[b.w, b.s], [b.e, b.s], [b.e, b.n], [b.w, b.n], [b.w, b.s]];
  const cw = (b: ReturnType<typeof box>) => [[b.w, b.s], [b.w, b.n], [b.e, b.n], [b.e, b.s], [b.w, b.s]];
  const world = { w: -180, s: -85, e: 180, n: 85 };
  const polygon = (outer: number[][], hole: number[][], o: number): FrameFeature => ({
    type: "Feature",
    properties: { o },
    geometry: { type: "Polygon", coordinates: [outer, hole] },
  });
  const rings = Array.from({ length: FADE_RINGS }, (_, i) => {
    const t = (i + 0.5) / FADE_RINGS; // 0 at the edge, 1 where the map is clear
    return polygon(ccw(box(i)), cw(box(i + 1)), Number(((1 - t) ** 1.6).toFixed(3)));
  });
  return { type: "FeatureCollection", features: [polygon(ccw(world), cw(box(0)), 1), ...rings] };
}

export function buildStyle({ origin, palette: p }: { origin: string; palette: MapPalette }): StyleSpecification {
  const streetLayers = (part: "casing" | "fill"): LayerSpecification[] =>
    [3, 2, 1, 0].map((c) => {
      const [meters, minPx] = STREET_WIDTHS[c];
      const casing = part === "casing";
      const color = casing ? [p.highwayCasing, p.arterialCasing, p.casing, p.casing][c] : c === 0 ? p.highway : p.street;
      return {
        id: `street-${part}-${c}`,
        type: "line",
        source: "streets",
        filter: ["==", ["get", "class"], c],
        minzoom: c === 3 ? 11.75 : 0, // v1 hid local streets below Leaflet zoom 12.75
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": color,
          "line-width": widthExpression(meters, minPx, casing ? CASING_PX : 0),
          "line-opacity": casing && c === 3 ? ["step", ["zoom"], 0.6, 13, 1] : 1,
        },
      };
    });

  const streetLabels = (id: string, classes: number[], minzoom: number, f: MapFont, size: number, spacing: number): LayerSpecification => ({
    id,
    type: "symbol",
    source: "streets",
    minzoom,
    filter: ["all", ["has", "name"], ["in", ["get", "class"], ["literal", classes]]],
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": spacing,
      "text-field": ["get", "name"],
      "text-font": font(f),
      "text-size": size,
      "text-max-angle": 30,
      "text-padding": 2,
    },
    paint: { "text-color": p.label, "text-halo-color": p.halo, "text-halo-width": 1.75 },
  });

  // Symbol layers listed later are placed first, so the order below is the label priority
  // from lowest to highest: street names, neighborhoods, parks and water, then the course
  // guard, then the mile markers and the start and finish tags.
  const layers: LayerSpecification[] = [
    { id: "background", type: "background", paint: { "background-color": p.land } },
    { id: "lake", type: "fill", source: "lake", paint: { "fill-color": p.water } },
    { id: "parks", type: "fill", source: "parks", paint: { "fill-color": p.park } },
    {
      id: "rivers",
      type: "line",
      source: "rivers",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.water, "line-width": widthExpression(60, 2.5) },
    },
    ...streetLayers("casing"),
    ...streetLayers("fill"),
    {
      id: "course-halo",
      type: "line",
      source: COURSE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": p.highlight,
        "line-width": widthExpression(COURSE_METERS, COURSE_MIN_PX, 12),
        // Strong enough to read as a glow at a glance on the night palette.
        "line-opacity": ["case", state("selected"), 0.38, state("hover"), 0.18, 0],
      },
    },
    {
      id: "course-casing",
      type: "line",
      source: COURSE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.courseCasing, "line-width": widthExpression(COURSE_METERS, COURSE_MIN_PX, 3.5) },
    },
    {
      id: "course-line",
      type: "line",
      source: COURSE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["interpolate-lab", ["linear"], ["coalesce", ["feature-state", "closed"], 0], 0, p.open, 1, p.closed],
        "line-width": widthExpression(COURSE_METERS, COURSE_MIN_PX),
      },
    },
    // The runner layer is inserted here, directly below RUNNER_BEFORE_LAYER.
    streetLabels(RUNNER_BEFORE_LAYER, [3], 14.5, "sans", 11, 380),
    streetLabels("street-labels-secondary", [2], 13.5, "sans", 11.5, 380),
    streetLabels("street-labels-major", [0, 1], 12, "sansBold", 12, 300),
    // The surround past the data box, over the streets and their names (they stop at the box)
    // and under everything that sits well inside it. It takes the page's own dark.
    {
      id: "frame",
      type: "fill",
      source: FRAME_SOURCE,
      paint: { "fill-color": p.bg, "fill-opacity": ["get", "o"], "fill-antialias": false },
    },
    {
      id: "hood-labels",
      type: "symbol",
      source: "labels",
      minzoom: 9.5, // below a 320 px phone's course fit (9.9) the names would only crowd the course
      maxzoom: 14.75, // v1 faded neighborhoods out by Leaflet zoom 15.75
      filter: ["all", kind("hood"), ["any", ["!", ["get", "minor"]], [">=", ["zoom"], 12.75]]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": font("display"),
        "text-size": ["step", ["zoom"], 13, 12, 15],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.12,
        "text-padding": 6,
        // Like v1, try beside and above or below the anchor when the label would sit on the course.
        "text-variable-anchor-offset": ["center", [0, 0], "left", [0.8, 0], "right", [-0.8, 0], "top", [0, 0.8], "bottom", [0, -0.8]],
      },
      paint: {
        "text-color": p.hood,
        "text-halo-color": p.halo,
        "text-halo-width": 1.5,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 14, 1, 14.75, 0],
      },
    },
    {
      id: "park-labels",
      type: "symbol",
      source: "labels",
      minzoom: 12.25,
      filter: kind("park"),
      layout: { "text-field": ["get", "name"], "text-font": font("sansBold"), "text-size": 12 },
      paint: { "text-color": p.parkInk },
    },
    {
      id: "water-labels",
      type: "symbol",
      source: "labels",
      filter: ["any", kind("lake"), ["all", kind("river"), [">=", ["zoom"], 13]]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": font("sansItalic"),
        "text-size": ["step", ["zoom"], ["match", ["get", "kind"], "river", 12, 15], 12, ["match", ["get", "kind"], "river", 12, 18]],
      },
      paint: { "text-color": p.waterInk },
    },
    {
      // Invisible markers along the course that every label placed after it (all of the
      // above) must avoid, so no label covers the closure colors. Never drawn: a constant
      // text-opacity of 0 skips the draw, but the markers still take part in placement.
      id: "course-label-guard",
      type: "symbol",
      source: COURSE_SOURCE,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 14,
        "text-field": "•",
        "text-font": font("mono"),
        "text-size": 10,
        "text-padding": 0,
        "text-allow-overlap": true,
      },
      paint: { "text-opacity": 0 },
    },
    {
      id: "mile-labels",
      type: "symbol",
      source: "miles",
      minzoom: 11,
      filter: ["all", kind("mile"), ["any", [">=", ["zoom"], 12], ["==", ["%", ["get", "mile"], 5], 0]]],
      layout: {
        "text-field": ["step", ["zoom"], ["get", "label"], 13.5, ["concat", COPY.mapMile.toUpperCase(), " ", ["get", "label"]]],
        "text-font": font("mono"),
        "text-size": ["step", ["zoom"], 10, 13.5, 10.5],
        "text-offset": ["array", "number", 2, ["get", "offset"]],
      },
      paint: { "text-color": p.highlight, "text-halo-color": p.courseCasing, "text-halo-width": 2 },
    },
    {
      id: "start-finish",
      type: "symbol",
      source: "miles",
      filter: ["!=", ["get", "kind"], "mile"],
      layout: {
        "text-field": ["get", "label"],
        "text-font": font("display"),
        "text-size": 13,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
        "text-anchor": "left",
        "text-offset": [1, 0],
        "symbol-sort-key": ["match", ["get", "kind"], "start", 0, 1],
      },
      paint: { "text-color": p.highlight, "text-halo-color": p.courseCasing, "text-halo-width": 2 },
    },
  ];

  return {
    version: 8,
    "font-faces": Object.fromEntries(Object.values(MAP_FONTS).map((f) => [f.face, assetUrl(origin, `${FONT_DIR}/${f.file}`)])),
    sources: {
      ...Object.fromEntries(MAP_SOURCES.map((s) => [s, { type: "geojson", data: assetUrl(origin, `data/${s}.json`) }])),
      // Built here, not fetched: a few rectangles from DATA_BOUNDS.
      [FRAME_SOURCE]: { type: "geojson", data: frameData() } satisfies GeoJSONSourceSpecification,
    },
    layers,
  };
}
