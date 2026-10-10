// The computation behind `npm run build:data`, kept pure so a test can compare it
// with the committed files in src/data and public/data.
import { COPY } from "../content/copy";
import { LANDMARKS, MINOR_HOODS } from "../content/landmarks";
import { COURSE_MILES, DAY_END, DAY_START, MODEL_RUNNERS } from "../content/race";
import { generateRunners, runnerStats, segmentTimes, type SegmentTimes } from "../model/runners";
import { clipLine, clipRing, type Box } from "./geo/clip";
import { MLAT, MLNG, decode, type LatLng, type MapData } from "./geo/decode";
import { joinSegments } from "./geo/join";
import { buildRoute, pointAlong, type SegmentSpan } from "./geo/route";
import { fitProjection, formatPath, project, type Projection } from "./geo/svg";

/** Bundled with the client (src/model/course.ts). `cum` is not stored: the client
 *  recomputes it bit for bit (cumulativeDistances), which keeps the file small. */
export type RouteJson = {
  len: number;
  mile: number;
  projection: Projection;
  points: LatLng[];
  segments: (SegmentSpan & SegmentTimes)[];
};

/** Server-only: the SVG course and basemap that src/map/CourseSvg.tsx renders. */
export type SvgJson = {
  width: number;
  height: number;
  clip: Box;
  course: string[];
  lake: string[];
  parks: string[];
  rivers: string[];
  start: [number, number];
  finish: [number, number];
};

/** Server-only: runners on the course every `step` minutes from `from` (5:00 AM) to
 *  7:00 PM, for the histogram behind the timeline's scrubber. */
export type HistogramJson = { from: number; step: number; counts: number[] };

/** Lazy-only: the 23 neighborhood label points as [name, lat, lng], for the Race tab's
 *  "near Lincoln Park" (v1's nearest-centroid rule). */
export type HoodsJson = [name: string, lat: number, lng: number][];
export const HISTOGRAM_STEP = 2;

type Position = [lng: number, lat: number];
type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "Polygon"; coordinates: Position[][] };
export type Feature = {
  type: "Feature";
  id?: number;
  properties: Record<string, string | number | boolean | number[]>;
  geometry: Geometry;
};
export type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

/** The GeoJSON files MapLibre's worker fetches from public/data/<name>.json. */
export const MAP_DATA_FILES = ["streets", "lake", "parks", "rivers", "labels", "course", "miles"] as const;
export type MapDataFile = (typeof MAP_DATA_FILES)[number];

/** v1 set mile markers beside the route, along its screen-space normal. The
 *  mile-labels layer uses `offset` as its text-offset, in ems. */
export const MILE_LABEL_OFFSET_EM = 1.4;

const round1 = (n: number) => Math.round(n * 10) / 10;
// Segment distances (m) and times (min) to 0.01: far below anything drawn or shown,
// and about 1.1 KB less of route.json in the first-load bundle.
const round2 = (n: number) => Math.round(n * 100) / 100;
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
const lngLat = ([lat, lng]: LatLng): Position => [round5(lng), round5(lat)];
const collection = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });

export function buildData(source: MapData): {
  route: RouteJson;
  svg: SvgJson;
  histogram: HistogramJson;
  hoods: HoodsJson;
  geojson: Record<MapDataFile, FeatureCollection>;
} {
  const course = source.course.map(decode);
  const built = buildRoute(course);
  const runners = generateRunners(MODEL_RUNNERS);
  const times = segmentTimes(runners, built.segments, built.len);
  const projection = fitProjection(built.points);
  // Drawn geometry bridges the one real gap between segments (8 and 9); route math keeps the raw segments.
  const drawn = joinSegments(course);

  const route: RouteJson = {
    len: built.len,
    mile: built.len / COURSE_MILES,
    projection,
    points: built.points,
    segments: built.segments.map((s, i) => ({
      d0: round2(s.d0),
      d1: round2(s.d1),
      first: round2(times[i].first),
      lead: round2(times[i].lead),
      peak: round2(times[i].peak),
      last: round2(times[i].last),
    })),
  };

  // The SVG letterboxes ("xMidYMid meet"), so geometry beside the viewBox shows on
  // wide screens. Keep what any screen up to 21:9 can show and drop the rest.
  const xy = (ll: LatLng) => project(projection, ll);
  const { width, height } = projection;
  const clip: Box = { minX: width / 2 - 1.2 * height, maxX: width / 2 + 1.2 * height, minY: -0.1 * height, maxY: 1.1 * height };
  const polygonPath = (rings: number[][]) =>
    rings
      .map((ring) => clipRing(decode(ring).map(xy), clip))
      .filter((ring) => ring.length > 2)
      .map((ring) => formatPath(ring, true))
      .join("");
  const [sx, sy] = xy(built.points[0]);
  const [fx, fy] = xy(built.points[built.points.length - 1]);
  const svg: SvgJson = {
    width,
    height,
    clip,
    course: drawn.map((line) => formatPath(line.map(xy))),
    lake: source.lake.map(polygonPath).filter(Boolean),
    parks: source.parks.map(polygonPath).filter(Boolean),
    rivers: source.rivers.flatMap((r) => clipLine(decode(r).map(xy), clip).map((run) => formatPath(run))),
    start: [round1(sx), round1(sy)],
    finish: [round1(fx), round1(fy)],
  };

  const polygons = (polys: number[][][]) =>
    collection(
      polys.map((rings) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: rings.map((ring) => decode(ring).map(lngLat)) },
      })),
    );
  const minor = new Set(MINOR_HOODS);
  const along = (d: number) => pointAlong(built.points, built.cum, d);
  const offsetAt = (d: number): number[] => {
    // The route's direction in screen space (x east, y south) around d, turned a quarter.
    const [lat0, lng0] = along(d - 5);
    const [lat1, lng1] = along(d + 5);
    const dx = (lng1 - lng0) * MLNG;
    const dy = -(lat1 - lat0) * MLAT;
    const k = MILE_LABEL_OFFSET_EM / (Math.hypot(dx, dy) || 1);
    return [Math.round(-dy * k * 100) / 100, Math.round(dx * k * 100) / 100];
  };
  const mile = built.len / COURSE_MILES;
  const geojson: Record<MapDataFile, FeatureCollection> = {
    streets: collection(
      source.streets.map(([nameIndex, roadClass, deltas]): Feature => ({
        type: "Feature",
        properties: nameIndex ? { class: roadClass, name: source.names[nameIndex] } : { class: roadClass },
        geometry: { type: "LineString", coordinates: decode(deltas).map(lngLat) },
      })),
    ),
    lake: polygons(source.lake),
    parks: polygons(source.parks),
    rivers: collection(
      source.rivers.map((r) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: decode(r).map(lngLat) } })),
    ),
    labels: collection([
      ...source.hoods.map(([name, lng, lat]): Feature => ({
        type: "Feature",
        properties: { name, kind: "hood", minor: minor.has(name) },
        geometry: { type: "Point", coordinates: [round5(lng), round5(lat)] },
      })),
      ...LANDMARKS.map((l): Feature => ({
        type: "Feature",
        properties: { name: l.name, kind: l.kind, minor: false },
        geometry: { type: "Point", coordinates: [round5(l.lng), round5(l.lat)] },
      })),
    ]),
    // Numeric ids 0..40 in race order: MapLibre feature-state needs numeric ids.
    course: collection(
      drawn.map((line, i) => ({ type: "Feature", id: i, properties: { index: i }, geometry: { type: "LineString", coordinates: line.map(lngLat) } })),
    ),
    miles: collection([
      ...Array.from({ length: 26 }, (_, k): Feature => ({
        type: "Feature",
        properties: { kind: "mile", mile: k + 1, label: String(k + 1), offset: offsetAt((k + 1) * mile) },
        geometry: { type: "Point", coordinates: lngLat(along((k + 1) * mile)) },
      })),
      { type: "Feature", properties: { kind: "start", mile: 0, label: COPY.mapStart }, geometry: { type: "Point", coordinates: lngLat(along(0)) } },
      { type: "Feature", properties: { kind: "finish", mile: 0, label: COPY.mapFinish }, geometry: { type: "Point", coordinates: lngLat(along(built.len)) } },
    ]),
  };

  const segmentEnds = built.segments.map((s) => s.d1);
  const histogram: HistogramJson = {
    from: DAY_START,
    step: HISTOGRAM_STEP,
    counts: Array.from(
      { length: (DAY_END - DAY_START) / HISTOGRAM_STEP + 1 },
      (_, i) => runnerStats(runners, DAY_START + i * HISTOGRAM_STEP, built.len, segmentEnds).on,
    ),
  };

  const hoods: HoodsJson = source.hoods.map(([name, lng, lat]) => [name, round5(lat), round5(lng)]);

  return { route, svg, histogram, hoods, geojson };
}
