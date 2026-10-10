import { AGENDA_COPY, BOARD_COPY, FIELD_COPY, LANES_COPY, PACE_COPY, WAVES_COPY } from "@/content/race-day";
import { EVENTS } from "@/content/events";
import { LEADERS, OPENING_TIME } from "@/content/race";
import { formatClock } from "@/model/time";
import { modelRunners, statsAt } from "../model-stats";
import { AgendaItemBody, agendaStates } from "../race/AgendaItem";
import { CalculatorStatic } from "../race/Calculator";
import { LaneRows } from "../race/LaneRows";
import { BoardView, FieldView, HeadlineView, StatsView } from "../race/RaceSections";
import { boardRows, mileBins, raceClock, story } from "../race/race-view";
import { Upgrade } from "../Upgrade";
import { ResultsSlot } from "./ResultsSlot";
import { SectionHead } from "./Section";
import { Tensed } from "./Tensed";

const WAVE_SWATCH = ["bg-wave-1", "bg-wave-2", "bg-wave-3"];

/** The Race tab. A server component: every section is prerendered at the
 *  5:50 AM opening; the live ones (Upgrade) follow the clock once the interaction layer loads. */
export function RaceTab() {
  const t = OPENING_TIME;
  const states = agendaStates(EVENTS, t);
  const stats = statsAt(t);
  const { head, sub } = story(t, stats, modelRunners());
  return (
    <div className="space-y-7">
      <ResultsSlot />

      <section>
        <Upgrade name="raceHeadline">
          <HeadlineView time={formatClock(t)} live={false} head={head} sub={sub} />
        </Upgrade>
      </section>

      <section aria-labelledby="agenda-title">
        <SectionHead id="agenda-title" title={AGENDA_COPY.title} caption={AGENDA_COPY.caption} />
        <Upgrade name="agenda">
          <ol className="mt-3 space-y-0.5" data-testid="agenda">
            {EVENTS.map((e, i) => (
              <li key={e.t} data-testid="agenda-item">
                <div data-state={states[i]} className="group flex w-full items-start gap-3 rounded-lg px-1 py-2 text-left data-[state=next]:bg-panel-2">
                  <AgendaItemBody event={e} state={states[i]} />
                </div>
              </li>
            ))}
          </ol>
        </Upgrade>
      </section>

      <section>
        <Upgrade name="raceStats">
          <StatsView on={stats.on} finished={stats.finished} waiting={stats.waiting} clock={raceClock(t)} />
        </Upgrade>
      </section>

      <section aria-labelledby="field-title">
        <SectionHead id="field-title" title={FIELD_COPY.title} caption={<Tensed text={FIELD_COPY.body} />} />
        <Upgrade name="raceField">
          <FieldView bins={mileBins(modelRunners(), t)} />
        </Upgrade>
      </section>

      <section aria-labelledby="board-title">
        <SectionHead id="board-title" title={BOARD_COPY.title} caption={BOARD_COPY.caption} />
        <Upgrade name="raceBoard">
          <BoardView rows={boardRows(LEADERS.filter((l) => l.shownByDefault), t)} />
        </Upgrade>
      </section>

      <section aria-labelledby="waves-title">
        <SectionHead id="waves-title" title={WAVES_COPY.title} caption={<Tensed text={WAVES_COPY.caption} />} />
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {WAVES_COPY.rows.map((w, i) => (
            <li key={w.wave} className="rounded-lg bg-panel-2 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <i aria-hidden="true" className={`size-2 rounded-full ${WAVE_SWATCH[i]}`} />
                {w.wave}
              </span>
              <b className="mt-1 block font-display text-xl font-bold leading-none text-fg">{w.at}</b>
              <span className="mt-1 block text-[11px] leading-tight text-soft">{w.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-soft">{WAVES_COPY.zone}</p>
        <p className="mt-1 text-xs text-muted">{WAVES_COPY.wheelchair}</p>
      </section>

      <section aria-labelledby="pace-title">
        <SectionHead id="pace-title" title={PACE_COPY.title} caption={PACE_COPY.lead} />
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {PACE_COPY.stats.map((s) => (
            <li key={s.value} className="rounded-lg bg-panel-2 px-3 py-2.5">
              <b className="block font-display text-xl font-bold leading-none text-fg">{s.value}</b>
              <span className="mt-1 block text-[11px] leading-tight text-muted">{s.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lanes-title">
        <SectionHead id="lanes-title" title={LANES_COPY.title} caption={LANES_COPY.caption} />
        <div className="mt-3">
          <Upgrade name="pace">
            <LaneRows youMinutes={270} />
            <CalculatorStatic />
          </Upgrade>
        </div>
      </section>
    </div>
  );
}
