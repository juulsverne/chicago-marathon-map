import type { MapPalette } from "./palette";

// The map paint properties that follow the light through the day, and the
// palette color each one takes. The course's red and blue, the runners and the
// highlights never change, so they are not here. tests/unit/palette-apply.test.ts
// checks every target against the style the engine builds.

export type PaintTarget = readonly [layer: string, property: string, color: string];

export function paintTargets(p: MapPalette): PaintTarget[] {
  const casing = [p.highwayCasing, p.arterialCasing, p.casing, p.casing];
  const targets: PaintTarget[] = [
    ["background", "background-color", p.land],
    ["frame", "fill-color", p.bg],
    ["lake", "fill-color", p.water],
    ["rivers", "line-color", p.water],
    ["parks", "fill-color", p.park],
    ["course-casing", "line-color", p.courseCasing],
    ["hood-labels", "text-color", p.hood],
    ["hood-labels", "text-halo-color", p.halo],
    ["park-labels", "text-color", p.parkInk],
    ["water-labels", "text-color", p.waterInk],
    ["mile-labels", "text-halo-color", p.courseCasing],
    ["start-finish", "text-halo-color", p.courseCasing],
  ];
  for (let c = 0; c < 4; c++) {
    targets.push([`street-casing-${c}`, "line-color", casing[c]]);
    targets.push([`street-fill-${c}`, "line-color", c === 0 ? p.highway : p.street]);
  }
  for (const id of ["street-labels-local", "street-labels-secondary", "street-labels-major"]) {
    targets.push([id, "text-color", p.label]);
    targets.push([id, "text-halo-color", p.halo]);
  }
  return targets;
}
