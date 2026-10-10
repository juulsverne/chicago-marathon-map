// Quality tiers. Pure: the browser's hints come in as plain values.

export type Tier = "high" | "medium" | "low";

export type TierSettings = Readonly<{
  /** Runner dots drawn: the first n of the tier-ordered field (src/map/runner-field.ts). */
  runners: number;
  /** Device pixels per CSS pixel are capped here, desktops included. */
  maxPixelRatio: number;
  /** Sky and fog, seen when the user pitches the map. */
  sky: "on" | "simplified" | "off";
}>;

export const TIERS: Readonly<Record<Tier, TierSettings>> = {
  high: { runners: 5300, maxPixelRatio: 2, sky: "on" },
  medium: { runners: 2650, maxPixelRatio: 1.5, sky: "simplified" },
  low: { runners: 1325, maxPixelRatio: 1, sky: "off" },
};

export function lowerTier(tier: Tier): Tier {
  return tier === "high" ? "medium" : "low";
}

export function pixelRatioFor(tier: Tier, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio || 1, TIERS[tier].maxPixelRatio);
}

/** Hints the browser exposes. A missing field is a hint it does not expose
 *  (Safari has no deviceMemory or Save-Data) and is ignored. */
export type DeviceHints = Readonly<{ saveData?: boolean; cores?: number; memoryGb?: number }>;

/** Low with Save-Data, 2 or fewer cores, or 2 GB or less; Medium with 4
 *  or fewer cores or 4 GB or less; High otherwise; Medium when neither cores nor
 *  memory is known (Save-Data says nothing about how fast the device is). */
export function startingTier(hints: DeviceHints): Tier {
  if (hints.saveData === true) return "low";
  const cores = hints.cores !== undefined && hints.cores > 0 ? hints.cores : undefined;
  const memory = hints.memoryGb !== undefined && hints.memoryGb > 0 ? hints.memoryGb : undefined;
  if ((cores !== undefined && cores <= 2) || (memory !== undefined && memory <= 2)) return "low";
  if (cores === undefined && memory === undefined) return "medium";
  if ((cores !== undefined && cores <= 4) || (memory !== undefined && memory <= 4)) return "medium";
  return "high";
}

type HintedNavigator = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

export function readDeviceHints(nav: Navigator): DeviceHints {
  const n = nav as HintedNavigator;
  return {
    saveData: n.connection?.saveData,
    cores: n.hardwareConcurrency || undefined,
    memoryGb: n.deviceMemory,
  };
}
