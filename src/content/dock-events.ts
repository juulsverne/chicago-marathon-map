// The five race-day moments on the timeline dock: the part of the event list that ships
// in the first-load JavaScript. The agenda's longer descriptions live in events.ts and are
// only imported where the agenda is, so they cost nothing here. "~" marks modeled times.

/** An event on the timeline dock: when, how it reads, and the pill (label, short time, tone). */
export type DockEvent = Readonly<{
  t: number;
  at: string;
  name: string;
  dock: Readonly<{ label: string; short: string; tone: "close" | "start" | "first" | "last" | "open" }>;
}>;

export const DOCK_EVENTS: readonly DockEvent[] = [
  { t: 360, at: "6:00 AM", name: "Streets close", dock: { label: "Streets close", short: "6:00a", tone: "close" } },
  { t: 450, at: "7:30 AM", name: "The race starts", dock: { label: "Race starts", short: "7:30a", tone: "start" } },
  { t: 572, at: "~9:32 AM", name: "First runner finishes", dock: { label: "First finisher", short: "~9:32a", tone: "first" } },
  { t: 920, at: "~3:20 PM", name: "Last runners finish", dock: { label: "Last finisher", short: "~3:20p", tone: "last" } },
  { t: 1080, at: "6:00 PM", name: "Last street reopens", dock: { label: "All streets open", short: "6:00p", tone: "open" } },
];
