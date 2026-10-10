// The map key (v1's "Map key", updated for v2). The prerendered key and the
// lazily loaded runner line import this module; it never ships in the first-load bundle.
// Each entry is a bold label and the text that follows it, as in v1.

export const KEY_COPY = {
  button: "Key",
  title: "Map key",
  closed: { label: "Closed to cars", rest: " at the time on the clock" },
  open: { label: "Open to cars", rest: ", before 6 AM or once reopened" },
  runners: {
    label: "Runners",
    rest: (people: number) => `: white dots. Each is about ${people} people, and they bunch up where the crowd is thickest.`,
    simple: ": white dots on the full map. This device shows the simple map, without them.",
  },
  mile: { label: "Mile marker", rest: ": miles from the start line", tag: "5" },
  startFinish: { label: "Start and finish", rest: ", both on Columbus Dr", tag: "Start" },
  leaders: { label: "Race leaders", rest: ": men, women, wheelchair men and women" },
  record: { label: "World-record pace", rest: " (1:59:30) for scale" },
  pace: { label: "Your pace", rest: ", once “Show my pace” is on" },
  shading: { label: "Timeline shading", rest: ": how many runners are on the course through the day" },
  spot: { label: "Your spot", rest: ", once you drop a pin" },
} as const;
