import { flatDistance, type LatLng } from "./decode";

/** Course segments as drawn. Where a segment ends short of the next one's start
 *  (v1's data has one such gap, about 64 m, between segments 8 and 9), extend it to
 *  that start: the same straight bridge buildRoute puts in the route. Route math
 *  keeps using the raw segments, so v1 parity is untouched. */
export function joinSegments(segments: readonly (readonly LatLng[])[], tolerance = 1): LatLng[][] {
  return segments.map((line, i) => {
    const next = segments[i + 1];
    const end = line[line.length - 1];
    return next && flatDistance(end, next[0]) >= tolerance ? [...line, next[0]] : [...line];
  });
}
