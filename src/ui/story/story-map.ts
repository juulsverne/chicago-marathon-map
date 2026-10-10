import type { LatLng } from "@/lib/geo/decode";
import { ROUTE_CUM, ROUTE_POINTS, SEGMENTS, SVG_PROJECTION, pointAt, svgPoint } from "@/model/course";

// The story's small course map: each closure as its own SVG path, cut from the one
// route the app already ships (so consecutive streets meet, and no extra data loads).

export type StoryMap = Readonly<{ width: number; height: number; paths: readonly string[] }>;

const fmt = (ll: LatLng) => {
  const [x, y] = svgPoint(ll);
  return `${x.toFixed(1)} ${y.toFixed(1)}`;
};

export function storyMap(): StoryMap {
  const paths = SEGMENTS.map((s) => {
    const points: LatLng[] = [pointAt(s.d0)];
    for (let i = 0; i < ROUTE_POINTS.length; i++) {
      if (ROUTE_CUM[i] > s.d0 && ROUTE_CUM[i] < s.d1) points.push(ROUTE_POINTS[i]);
    }
    points.push(pointAt(s.d1));
    return `M${points.map(fmt).join("L")}`;
  });
  return { width: SVG_PROJECTION.width, height: SVG_PROJECTION.height, paths };
}
