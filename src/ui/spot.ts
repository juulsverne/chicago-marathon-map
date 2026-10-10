import type { LatLng } from "@/lib/geo/decode";
import { sheetSnap } from "./panel/sheet-state";
import { requestTab } from "./panel/tabs";
import { Store } from "./store";
import { PHONE_QUERY } from "./use-media";

// Check your spot: the pin lives in this browser only. It is kept
// in localStorage (guarded: storage can throw in private windows), never in a URL, never
// sent anywhere, never logged. The key and format are v1's, so a pin dropped on v1 (the
// same origin) carries over.

const KEY = "cm-pin";

export type Locating = "idle" | "asking" | "denied" | "unavailable";
/** `from`: where the pin came from (a saved pin, a tap on the map, a location fix). */
export type SpotState = Readonly<{ pin: LatLng | null; from: "saved" | "map" | "location"; picking: boolean; locating: Locating }>;

/** A saved pin, or null for anything that is not [lat, lng] on the globe. */
export function parsePin(raw: string | null): LatLng | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length !== 2) return null;
    const [lat, lng] = value;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

function readPin(): LatLng | null {
  try {
    return parsePin(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

function writePin(pin: LatLng | null): void {
  try {
    if (pin) localStorage.setItem(KEY, JSON.stringify(pin));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage is off (a private window, blocked site data): the pin lasts for this visit.
  }
}

export const spot = new Store<SpotState>({ pin: readPin(), from: "saved", picking: false, locating: "idle" });

export function setPin(pin: LatLng | null, from: SpotState["from"] = "map"): void {
  writePin(pin);
  spot.set({ ...spot.get(), pin, from, picking: false });
}

export function setPicking(picking: boolean): void {
  spot.set({ ...spot.get(), picking });
}

/** Shows the spot card after a pin lands from the map (v1): the Streets tab from its top,
 *  where the card leads, and on phones the sheet at half. */
export function revealSpot(): void {
  requestTab("streets");
  if (window.matchMedia(PHONE_QUERY).matches) sheetSnap.set("half");
}

/** "Use my location": one position fix, on the device. The browser asks for
 *  permission the first time; a refusal or a missing fix is explained and the manual
 *  pin stays available. */
export function locate(geo: Geolocation | undefined = typeof navigator === "undefined" ? undefined : navigator.geolocation): void {
  if (!geo) {
    spot.set({ ...spot.get(), locating: "unavailable" });
    return;
  }
  spot.set({ ...spot.get(), locating: "asking", picking: false });
  geo.getCurrentPosition(
    (position) => {
      setPin([position.coords.latitude, position.coords.longitude], "location");
      spot.set({ ...spot.get(), locating: "idle" });
    },
    (error) => spot.set({ ...spot.get(), locating: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
  );
}
