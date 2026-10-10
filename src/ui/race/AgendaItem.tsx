import type { RaceEvent } from "@/content/events";
import { AGENDA_COPY } from "@/content/race-day";

export type AgendaState = "past" | "next" | "future";

/** Each event's state at minute `t`: reached, the next one, or still ahead (v1). */
export function agendaStates(events: readonly RaceEvent[], t: number): AgendaState[] {
  const next = events.findIndex((e) => e.t > t);
  return events.map((e, i) => (e.t <= t ? "past" : i === next ? "next" : "future"));
}

const DOT: Readonly<Record<RaceEvent["kind"], string>> = {
  close: "border-closed data-[state=past]:bg-closed",
  race: "border-fg data-[state=past]:bg-fg",
  open: "border-open data-[state=past]:bg-open",
};

/** One moment of "Race day at a glance": time, a dot by kind, name and detail. Past moments
 *  step down in color (v1 dimmed them), never below 4.5:1. */
export function AgendaItemBody({ event, state }: { event: RaceEvent; state: AgendaState }) {
  return (
    <>
      <span className="w-[4.5rem] shrink-0 pt-0.5 text-right font-mono text-xs text-muted group-data-[state=past]:text-soft">{event.at}</span>
      <span aria-hidden="true" data-state={state} className={`mt-1 size-2.5 shrink-0 rounded-full border-2 ${DOT[event.kind]}`} />
      <span className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-fg group-data-[state=past]:text-muted">{event.name}</span>
        {state === "next" && (
          <span className="ml-2 rounded-full bg-closed px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-bg">{AGENDA_COPY.next}</span>
        )}
        <span className="mt-0.5 block text-xs leading-snug text-muted group-data-[state=past]:text-soft">{event.detail}</span>
      </span>
    </>
  );
}
