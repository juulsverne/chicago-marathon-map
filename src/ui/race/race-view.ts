import hoods from "@/data/hoods.json";
import { BOARD_COPY, STORY } from "@/content/race-day";
import { COURSE_MILES, GUN, STREETS_CLOSE, WAVES, leader, type Leader } from "@/content/race";
import { MLAT, MLNG, type LatLng } from "@/lib/geo/decode";
import { closedCount } from "@/model/closures";
import { ROUTE_LEN, pointAt } from "@/model/course";
import { formatPeople, people, type Runner, type RunnerStats } from "@/model/runners";
import { youWave } from "@/model/pace";
import { formatShort } from "@/model/time";
import { hoursMinutes } from "./lanes";

// What the Race tab says at minute t: v1's story, board and histogram, from the full
// model, corrected against the sources. Pure: the prerendered tab and the live one share it.

export type LeaderState = Readonly<{ kind: "wait" | "run" | "done"; f: number; mile: number }>;

/** Where a leader is at minute t: waiting to start, running (fraction and mile), or done. */
export function leaderState(l: Leader, t: number): LeaderState {
  const f = (t - l.start) / l.T;
  if (f <= 0) return { kind: "wait", f: 0, mile: 0 };
  if (f >= 1) return { kind: "done", f: 1, mile: COURSE_MILES };
  return { kind: "run", f, mile: f * COURSE_MILES };
}

/** The neighborhood label nearest a point (v1: planar metres to the 23 centroids). */
export function nearestHood([lat, lng]: LatLng): string {
  let best = "";
  let bestD = Infinity;
  for (const [name, hlat, hlng] of hoods as [string, number, number][]) {
    const d = ((hlat - lat) * MLAT) ** 2 + ((hlng - lng) * MLNG) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best === "The Loop" ? "the Loop" : best;
}

/** The runner nearest the start among those on the course, as a route distance. */
export function backOfPack(runners: readonly Runner[], t: number): number | null {
  let min = Infinity;
  for (const r of runners) {
    const f = (t - r.start) / r.T;
    if (f > 0 && f < 1 && f < min) min = f;
  }
  return min === Infinity ? null : min * ROUTE_LEN;
}

const count = (n: number) => formatPeople(people(n));

/** The headline that follows the race clock (v1's story; at exactly 7:30 it now names the
 *  men's leader at the start rather than v1's "Everyone has finished"). */
export function story(t: number, stats: RunnerStats, runners: readonly Runner[]): { head: string; sub: string } {
  if (t < STREETS_CLOSE) return STORY.quiet;
  if (t < 440) return STORY.closed;
  if (t < GUN) return STORY.wheelchair;
  const men = leaderState(leader("men"), t);
  if (men.kind !== "done") {
    const parts = [
      stats.waiting > 0 ? STORY.waiting(count(stats.waiting)) : "",
      leaderState(leader("wcm"), t).kind === "done" ? STORY.wheelchairHome : "",
      STORY.onCourse(count(stats.on)),
    ];
    return { head: STORY.leading(nearestHood(pointAt(men.f * ROUTE_LEN)), men.mile.toFixed(1)), sub: parts.filter(Boolean).join(" ") };
  }
  if (stats.on > 0 || stats.waiting > 0) {
    const wom = leaderState(leader("wom"), t);
    const back = backOfPack(runners, t);
    return {
      head: wom.kind === "run" ? STORY.womenLeading(wom.mile.toFixed(1)) : STORY.stillOn(count(stats.on)),
      sub: STORY.backOfPack(back === null ? nearestHood(pointAt(0)) : nearestHood(pointAt(back)), count(stats.finished)),
    };
  }
  const closed = closedCount(t);
  return closed > 1 ? { head: STORY.finished.head, sub: STORY.finished.sub(closed) } : STORY.done;
}

/** v1's "race clock, from the 7:30 gun": "-1:40" before it, "1:05" after. */
export function raceClock(t: number): string {
  const m = Math.round(Math.abs(t - GUN));
  const text = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  return t < GUN ? `-${text}` : text;
}

/** Runners on the course in each of 27 one-mile bins (v1's histogram), from the full model. */
export function mileBins(runners: readonly Runner[], t: number): number[] {
  const bins = new Array<number>(27).fill(0);
  for (const r of runners) {
    const f = (t - r.start) / r.T;
    if (f > 0 && f < 1) bins[Math.min(26, Math.floor(f * COURSE_MILES))]++;
  }
  return bins;
}

export type BoardRow = Readonly<{ id: Leader["id"]; name: string; sub: string; value: string }>;

/** "Front of the race": each shown leader, with where they are (v1's board). */
export function boardRows(leaders: readonly Leader[], t: number): BoardRow[] {
  return leaders.map((l) => {
    const s = leaderState(l, t);
    const near = s.kind === "run" ? BOARD_COPY.near(nearestHood(pointAt(s.f * ROUTE_LEN))) : "";
    const value =
      s.kind === "wait" ? BOARD_COPY.starts(formatShort(l.start)) : s.kind === "run" ? BOARD_COPY.mile(s.mile.toFixed(1)) : BOARD_COPY.done(formatShort(l.start + l.T));
    const sub = l.id === "you" ? BOARD_COPY.youSub(WAVES[youWave(l.T)].name, hoursMinutes(l.T)) : l.sub;
    return { id: l.id, name: l.name, sub: `${sub}${near}`, value };
  });
}
