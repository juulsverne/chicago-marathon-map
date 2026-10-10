import type { LatLng } from "./decode";

export type Projection = Readonly<{ minLng: number; maxLat: number; kx: number; scale: number; width: number; height: number }>;

const KX = Math.cos((41.88 * Math.PI) / 180);

/** Equirectangular projection fitted to `points`, `width` units wide, with
 *  `pad` (a fraction of each span) of margin on every side. */
export function fitProjection(points: readonly LatLng[], width = 1000, pad = 0.12): Projection {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const spanX = (maxLng - minLng) * KX;
  const spanY = maxLat - minLat;
  const padX = spanX * pad;
  const padY = spanY * pad;
  const scale = width / (spanX + 2 * padX);
  const height = Math.round((spanY + 2 * padY) * scale * 10) / 10;
  return { minLng: minLng - padX / KX, maxLat: maxLat + padY, kx: KX, scale, width, height };
}

export function project(p: Projection, [lat, lng]: LatLng): [number, number] {
  return [(lng - p.minLng) * p.kx * p.scale, (p.maxLat - lat) * p.scale];
}

/** An SVG path string for already projected points, one decimal per coordinate. */
export function formatPath(points: readonly (readonly [number, number])[], close = false): string {
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  return close ? `${d}Z` : d;
}

export function pathD(p: Projection, line: readonly LatLng[], close = false): string {
  return formatPath(
    line.map((pt) => project(p, pt)),
    close,
  );
}
