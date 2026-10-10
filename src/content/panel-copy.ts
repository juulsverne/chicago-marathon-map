// Panel copy used only by server components and the lazily loaded interaction layer.
// Strings here never reach the first-load bundle (src/content/copy.ts does, whole,
// because first-load client components import it).

export const PANEL_COPY = {
  label: "Race day details",
  closedToCars: "Closed to cars",
  openToCars: "Open to cars",
  sheetShow: "Show the panel",
  sheetExpand: "Expand the panel",
  sheetShrink: "Shrink the panel and show more of the map",
} as const;
