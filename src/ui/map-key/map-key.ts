import { FIELD } from "@/content/race";
import { TIERS, type Tier } from "@/quality/tiers";

/** The key's popover element (src/ui/map-key/MapKey.tsx). */
export const KEY_ID = "map-key";

/** About how many people one runner dot stands for at a quality tier: the displayed
 *  field over the dots that tier draws. */
export function peoplePerDot(tier: Tier): number {
  return Math.round(FIELD / TIERS[tier].runners);
}
