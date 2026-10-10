// Accessible names start with the text the control shows and then explain it (WCAG 2.5.3,
// Label in Name), so a voice-control user can say what they see.
// The speed caption reads "Per second" over "5 min" (an "=" read like a dash).
const SPEED_UNIT = "Per second";
const speedValue = (speed: number) => `${speed} min`;
/** "~9:32 AM" read aloud as "about 9:32 AM". */
const spoken = (at: string) => at.replace(/^~/, "about ");
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export const COPY = {
  eyebrow: "Chicago Marathon · Sunday, Oct 11, 2026",
  title: "Race-Day Street Closures",
  timeZone: "CT",
  mapTime: "Map time",
  /** The clock's chip: what is happening at the map time, before the first key moment and
   *  then from each one on (src/content/dock-events.ts). Short enough for the clock's fixed width. */
  phases: ["Before closures", "Streets closed", "Race underway", "Runners finishing", "Reopening", "Streets open"],
  live: "Live",
  play: "Play race day",
  pause: "Pause",
  scrubLabel: "Time on race day",
  timelineLabel: "Race day timeline",
  mapLabel: "Map of the marathon course showing which streets are closed",
  // The panel's one-line summary (the phone sheet's peek line).
  closedOf: (total: number) => `of ${total} closed`,
  beforeClose: "Streets close at 6:00 AM CT",
  nextToReopen: (street: string, at: string) => `Next to reopen: ${street} at ${at} CT`,
  allReopened: "Every course street has reopened, except the finish area",
  tabsLabel: "Panel sections",
  tabs: { streets: "Streets", race: "Race", records: "Records", facts: "Facts" },
  disclaimer:
    "Unofficial. Not affiliated with the Bank of America Chicago Marathon or the City of Chicago. Runner positions are modeled, not live tracking. Official alerts:",
  notifyLabel: "NotifyChicago",
  notifyUrl: "https://www.notifychicago.org/",
  mapStart: "Start",
  mapFinish: "Finish",
  mapMile: "Mile",
  mapFallback: "Simple map: this device can't draw the live runner stream. Closures, leaders and times still update.",
  momentsLabel: "Key moments",
  momentsZone: "Times CT",
  /** A key-moment pill shows its short time and label ("~9:32a First finisher"). */
  momentLabel: (m: { at: string; name: string; dock: { short: string; label: string } }) =>
    `${m.dock.short} ${m.dock.label}: ${spoken(m.at)} CT, ${lowerFirst(m.name)}`,
  speedUnit: SPEED_UNIT,
  speedValue,
  /** The speed button shows "Per second" over "5 min". */
  speedLabel: (speed: number) =>
    `${SPEED_UNIT} ${speedValue(speed)}: playback speed, one second equals ${speed} ${speed === 1 ? "minute" : "minutes"} of race day. Tap to change.`,
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitCourse: "Show the whole course",
  recenter: "Recenter",
} as const;
