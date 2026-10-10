import type { SourceId } from "./sources";

// The Streets tab: how every closure works, the 41 closures and search.

export const STREETS_COPY = {
  cells: {
    label: "Each block is one course street, in race order",
    caption: "Each block is one course street, in race order. Tap one to find it.",
    start: "Start",
    finish: "Finish",
  },
  lifecycle: {
    title: "Every closure works the same way",
    body: "Course streets close at about 6:00 AM, stay closed while runners pass, then reopen as the last runners pass (15-minute-mile pace), on Chicago Police's call.",
    phases: ["Waiting", "Runners", "Final runners", "Open"],
    marks: ["6:00 AM", "first runners", "main field passed", "reopens"],
    sources: ["S1", "S2"] as readonly SourceId[],
  },
  list: {
    title: "All 41 closures",
    caption: "Grouped by neighborhood in race order. Tap a street to see it on the map.",
    searchLabel: "Find a street",
    searchPlaceholder: "Find a street, like Halsted",
    noMatch: (query: string) => `No course street matches '${query}'`,
    reopens: "Reopens",
    reopensFinish: "Mon 3:00 PM",
    finishWindow: "Closed Thu 6:00 AM to Mon 3:00 PM",
    miles: (from: string, to: string) => `mi ${from}–${to}`,
    area: (from: string, to: string, count: number) => `Miles ${from} to ${to} · ${count} streets`,
    areaReopens: (range: string) => `Reopen ${range}`,
    areaFinish: "Finish: Mon 3:00 PM",
    timesNote:
      "Times are the organizer's anticipated reopenings, in Central Time (CT). Chicago Police reopen each street once the last runners pass, at a 15-minute-mile pace.",
    timesNoteSources: { sources: ["S1", "S2"] as readonly SourceId[] },
  },
  footer: {
    text: "Closure and reopening times come from the Bank of America Chicago Marathon's street-closure notice (Aug 31, 2026). Streets are traced on the City of Chicago's street centerline data. Runner positions are a model, not live tracking. Plans can change on race day, and NotifyChicago sends the official alerts.",
    sources: ["S1", "S26", "S28"] as readonly SourceId[],
  },
} as const;
