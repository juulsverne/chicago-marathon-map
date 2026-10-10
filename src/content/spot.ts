// Check your spot. Server components and the lazy layer only.

export const SPOT_COPY = {
  title: "Check your spot",
  intro: "Drop a pin where you live, work or plan to watch. See the nearest closure, when it reopens and when runners come by.",
  drop: "Drop a pin",
  locate: "Use my location",
  locating: "Finding you…",
  picking: "Tap the map to drop your pin",
  cancel: "Cancel",
  /** The pin button in the map controls (v1's), and the note it leaves on the map. */
  mapButton: "Drop a pin on your spot",
  dismiss: "Close",
  yours: "Your spot",
  move: "Move",
  clear: "Clear",
  private: "Your pin stays in this browser. It never leaves your device.",
  nearest: (street: string, range: string, distance: string, minutes: number) =>
    `Nearest course street: ${street} (${range}), ${distance} away (about ${minutes} min walk).`,
  closedWindow: (reopens: string) => `Closed to cars 6:00 AM → ${reopens} CT`,
  finishWindow: "Closed to cars Thu 6:00 AM → Mon 3:00 PM CT",
  times: "Runners pass here (CT)",
  others: "Other course streets nearby",
  otherRow: (range: string, distance: string) => `${range} · ${distance} away`,
  outside: "That spot is outside the race area.",
  far: "Nothing closes within a mile of here.",
  denied: "Location is off for this site, so it can't find you. Drop a pin by hand instead.",
  unavailable: "Your location isn't available right now. Drop a pin by hand instead.",
} as const;
