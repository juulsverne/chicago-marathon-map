import type { SourceId } from "./sources";

// The results slot: filled in by hand after the race from the organizer's
// published results, with their source. The Race tab renders it only when it is not null.

export type RaceResult = Readonly<{ category: string; name: string; country: string; time: string }>;
export type RaceResults = Readonly<{ title: string; asOf: string; rows: readonly RaceResult[]; sources: readonly SourceId[] }>;

export const RESULTS: RaceResults | null = null;
