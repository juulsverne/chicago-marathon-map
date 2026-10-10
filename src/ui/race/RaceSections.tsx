import type { ReactNode } from "react";
import { BOARD_COPY, FIELD_COPY, HIST_PLACES, STATS_COPY, STORY } from "@/content/race-day";
import { formatPeople, people } from "@/model/runners";
import type { BoardRow } from "./race-view";

// The Race tab's live sections as plain views: the prerendered tab draws them at 5:50 AM
// and the interaction layer (RaceLive.tsx) redraws them as the clock moves.

const LEADER_BG: Readonly<Record<BoardRow["id"], string>> = {
  wcm: "bg-leader-wcm",
  wcw: "bg-leader-wcw",
  men: "bg-leader-men",
  wom: "bg-leader-wom",
  wr: "bg-leader-wr",
  you: "bg-leader-you",
};

/** "At 9:32 AM CT · live", then the story's headline and line. */
export function HeadlineView({ time, live, head, sub }: { time: string; live: boolean; head: string; sub: string }) {
  return (
    <div data-testid="race-headline">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
        {STORY.at(time)}
        {live && <span className="text-closed"> · {STORY.live}</span>}
      </p>
      <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight tracking-wide text-fg">{head}</h3>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

/** The four tiles: on the course, finished, still waiting (people), and the race clock.
 *  Counts are plain text; live, `rolling` draws rolling digits over them (the text keeps
 *  the box and stays what screen readers read), as the clock does. */
export function StatsView({ on, finished, waiting, clock, rolling }: { on: number; finished: number; waiting: number; clock: string; rolling?: (value: number) => ReactNode }) {
  const count = (n: number) => {
    const value = people(n);
    return (
      <span className="relative block">
        <span className={rolling ? "opacity-0" : undefined}>{formatPeople(value)}</span>
        {rolling && (
          <span aria-hidden="true" className="absolute inset-0 whitespace-nowrap">
            {rolling(value)}
          </span>
        )}
      </span>
    );
  };
  const tiles: [ReactNode, string][] = [
    [count(on), STATS_COPY.onCourse],
    [count(finished), STATS_COPY.finished],
    [count(waiting), STATS_COPY.waiting],
    [clock, STATS_COPY.raceClock],
  ];
  return (
    <ul className="grid grid-cols-2 gap-2" data-testid="race-stats">
      {tiles.map(([value, label]) => (
        <li key={label} className="rounded-lg bg-panel-2 px-3 py-2.5">
          <b className="block font-display text-2xl font-bold leading-none text-fg tabular-nums">{value}</b>
          <span className="mt-1 block text-[11px] leading-tight text-muted">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Where the 55,000 are": runners per mile as bars, with v1's labels. */
export function FieldView({ bins }: { bins: readonly number[] }) {
  const top = Math.max(40, ...bins); // v1 never let the scale drop below 40 modeled runners
  const w = 270;
  const h = 72;
  const bw = w / bins.length;
  return (
    <figure className="mt-3" data-testid="race-field">
      <div className="flex justify-between font-mono text-[10px] text-soft">
        <span>{FIELD_COPY.chartLabel}</span>
        <span>{FIELD_COPY.peak(formatPeople(people(top)))}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-20 w-full" role="img" aria-label={FIELD_COPY.chartLabel} preserveAspectRatio="none">
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="stroke-line" strokeWidth="0.5" />
        {bins.map((b, i) => {
          const bh = (b / top) * (h - 2);
          return <rect key={i} x={i * bw + 0.5} width={bw - 1} y={h - bh} height={bh} rx="1" className="fill-closed" />;
        })}
      </svg>
      <div aria-hidden="true" className="relative mt-1 h-3 font-mono text-[10px] text-soft">
        {FIELD_COPY.miles.map((m) => (
          <span key={m} className="absolute -translate-x-1/2" style={{ left: `${((m + 0.5) / bins.length) * 100}%` }}>
            {m}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="relative h-4 text-[10px] font-semibold text-soft">
        {HIST_PLACES.map((p) => (
          <span key={p.name} className={`absolute ${p.bin === 0 ? "" : "-translate-x-1/2"}`} style={{ left: `${((p.bin + (p.bin === 0 ? 0 : 0.5)) / bins.length) * 100}%` }}>
            {p.name}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** "Front of the race": the leaders and where they are. */
export function BoardView({ rows }: { rows: readonly BoardRow[] }) {
  return (
    <>
      <ul className="mt-3 divide-y divide-line" data-testid="race-board">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2" data-leader={r.id}>
            <i aria-hidden="true" className={`size-3 shrink-0 rounded-full ring-2 ring-fg/80 ${LEADER_BG[r.id]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{r.name}</span>
              <span className="block truncate text-[11px] text-soft">{r.sub}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="pt-2 font-mono text-[10px] uppercase tracking-wider text-soft">{BOARD_COPY.zone}</p>
    </>
  );
}
