import { ROUTE_LEN, SEGMENT_ENDS } from "@/model/course";
import { generateRunners, runnerStats, type Runner, type RunnerStats } from "@/model/runners";

// The full 5,300-runner model, built once on first use, for the counts the panels show.
// Counts never depend on the quality tier, which only thins what the map draws
//. Interaction layer only.

let runners: readonly Runner[] | null = null;
let cached: { t: number; stats: RunnerStats } | null = null;

export function modelRunners(): readonly Runner[] {
  runners ??= generateRunners();
  return runners;
}

/** Runners waiting, on the course (and per segment) and finished at minute `t`, memoized
 *  for the last minute asked, since every live panel asks about the same one. */
export function statsAt(t: number): RunnerStats {
  if (cached?.t !== t) cached = { t, stats: runnerStats(modelRunners(), t, ROUTE_LEN, SEGMENT_ENDS) };
  return cached.stats;
}
