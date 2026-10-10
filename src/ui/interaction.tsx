"use client";

// The interaction layer: loaded by src/ui/interaction-loader.ts after first paint,
// never part of the first-load bundle. Components here take over from the
// prerendered markup the shell already shows.

import { StreetCard } from "./card/StreetCard";
import { MapLink } from "./MapLink";
import { KeyDismiss, KeyRunners } from "./map-key/MapKeyLive";
import { PaceLive } from "./race/PaceLive";
import { SharedStreet } from "./share/SharedStreet";
import { SpotCard } from "./spot/SpotCard";
import { JumpToast, LiveAgenda, LiveBoard, LiveField, LiveHeadline, LiveStats } from "./race/RaceLive";
import { SheetController } from "./panel/SheetController";
import { LiveStreetCells, LiveStreetList } from "./streets/LiveStreets";
import { StoryButton } from "./story/StoryButton";
import { StoryHost } from "./story/StoryHost";

export { ClockDigits } from "./ClockDigits";
export { TabBar } from "./panel/TabBar";

/** Live parts that replace prerendered markup, by name (src/ui/Upgrade.tsx). */
export const ISLANDS = {
  streetCells: LiveStreetCells,
  streetList: LiveStreetList,
  sheet: SheetController,
  card: StreetCard,
  mapLink: MapLink,
  raceHeadline: LiveHeadline,
  agenda: LiveAgenda,
  raceStats: LiveStats,
  raceField: LiveField,
  raceBoard: LiveBoard,
  toast: JumpToast,
  pace: PaceLive,
  spot: SpotCard,
  sharedStreet: SharedStreet,
  keyRunners: KeyRunners,
  keyDismiss: KeyDismiss,
  storyButton: StoryButton,
  storyHost: StoryHost,
};
