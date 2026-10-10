// Fit padding lives apart from camera.ts so MapStage (first-load JavaScript) can use it
// without pulling in the course geometry, which only the map engine needs.

export type Insets = { top: number; right: number; bottom: number; left: number };

const GAP = 16;

/** Padding that keeps the course clear of the UI over the map. `chrome` gives the
 *  bottom edge of the top bar, the top edge of the dock and the left edge of
 *  anything on the right (controls, the panel slot), in CSS px from the map's
 *  top-left corner. When the chrome would leave the course less than 40% of either
 *  dimension, the padding shrinks proportionally. */
export function fitPadding(viewport: { width: number; height: number }, chrome: { top: number; bottom: number; right: number }): Insets {
  const top = Math.max(0, chrome.top) + GAP;
  const bottom = Math.max(0, viewport.height - chrome.bottom) + GAP;
  const right = Math.max(0, viewport.width - chrome.right) + GAP;
  const left = GAP;
  const fit = (a: number, b: number, size: number) => {
    const room = size * 0.6;
    const k = a + b > room ? room / (a + b) : 1;
    return [Math.round(a * k), Math.round(b * k)];
  };
  const [t, b] = fit(top, bottom, viewport.height);
  const [l, r] = fit(left, right, viewport.width);
  return { top: t, right: r, bottom: b, left: l };
}
