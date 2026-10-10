"use client";

import { COPY } from "@/content/copy";
import { useStage } from "./stage-context";

/** The quiet note shown when the map falls back to the simple SVG renderer. */
export function MapNote() {
  if (useStage().engine !== "fallback") return null;
  return (
    <p role="status" className="rounded-panel bg-panel/95 px-3 py-2 text-xs leading-snug text-muted shadow-lg ring-1 ring-line">
      {COPY.mapFallback}
    </p>
  );
}
