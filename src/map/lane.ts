import type { ExpressionSpecification } from "maplibre-gl";

// Street and runner sizing, ported from v1. v1 drew on Leaflet's 256-px tiles;
// MapLibre uses 512-px tiles, so MapLibre zoom z equals v1 (Leaflet) zoom z + 1.
// Every v1 zoom threshold below is shifted down by one.

const COS_LAT = Math.cos((41.89 * Math.PI) / 180);
const MPP_AT_ZOOM_0 = 78271.517 * COS_LAT; // metres per CSS pixel at MapLibre zoom 0

export function metersPerPixel(zoom: number): number {
  return MPP_AT_ZOOM_0 / 2 ** zoom;
}

/** v1's W(m, min, z): something `meters` wide on the ground, never under `minPx`. */
export function widthPx(meters: number, minPx: number, zoom: number): number {
  return Math.max(minPx, meters / metersPerPixel(zoom));
}

/** widthPx(meters, minPx) + addPx as a MapLibre zoom expression. Base-2 exponential
 *  interpolation between the zoom where the width leaves its minimum and zoom 22
 *  reproduces meters / metersPerPixel exactly, offset included. */
export function widthExpression(meters: number, minPx: number, addPx = 0): ExpressionSpecification {
  const z0 = Math.max(0, Math.log2((minPx * MPP_AT_ZOOM_0) / meters));
  const at = (z: number) => widthPx(meters, minPx, z) + addPx;
  return ["interpolate", ["exponential", 2], ["zoom"], z0, at(z0), 22, at(22)];
}

/** The course line: v1's lineW = max(4, W(17, 0) * 1.05). */
export const COURSE_METERS = 17 * 1.05;
export const COURSE_MIN_PX = 4;

export function courseWidth(zoom: number): number {
  return widthPx(COURSE_METERS, COURSE_MIN_PX, zoom);
}

/** Runner dot radius in CSS px (v1: below Leaflet 14 max(1.35, lw*.36), else clamp(lw*.2, 2.2, 3.6)). */
export function runnerRadius(zoom: number): number {
  const lw = courseWidth(zoom);
  return zoom < 13 ? Math.max(1.35, lw * 0.36) : Math.min(3.6, Math.max(2.2, lw * 0.2));
}

/** Half the street width runners may use, in CSS px: max(0, lw - 2r - 1) / 2. */
export function laneHalfWidth(zoom: number): number {
  return Math.max(0, courseWidth(zoom) - 2 * runnerRadius(zoom) - 1) * 0.5;
}

/** Leader marker radius in CSS px: max(5.5, r + 3.5). */
export function leaderRadius(zoom: number): number {
  return Math.max(5.5, runnerRadius(zoom) + 3.5);
}

/** MapLibre's world is 512 * 2^zoom CSS px wide; mercator units are 0..1 across it. */
export function pxToMercator(px: number, zoom: number): number {
  return px / (512 * 2 ** zoom);
}
