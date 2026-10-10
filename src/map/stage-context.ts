import { createContext, useContext } from "react";
import type { Tier } from "@/quality/tiers";
import type { MapEngine } from "./engine";

/** Which renderer the map stage shows. "svg" is first paint (and the state while
 *  MapLibre loads), "map" is MapLibre, "fallback" is the SVG for good. */
export type EngineKind = "svg" | "map" | "fallback";

export type StageState = Readonly<{
  engine: EngineKind;
  /** False once the cross-fade to MapLibre has finished: the SVG course stops updating. */
  svgLive: boolean;
  /** MapLibre's quality tier, once it has started. */
  tier: Tier | null;
  /** The running MapLibre engine, for the map controls. */
  api: MapEngine | null;
  /** Whether any of the course is on screen (the Recenter control shows when not). */
  courseInView: boolean;
}>;

export const INITIAL_STAGE: StageState = { engine: "svg", svgLive: true, tier: null, api: null, courseInView: true };

export const StageContext = createContext<StageState>(INITIAL_STAGE);

export function useStage(): StageState {
  return useContext(StageContext);
}
