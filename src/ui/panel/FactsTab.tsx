import { DATA_CREDITS, FACT_TILES, FACTS_COPY, RACE_WEEK, WATCH } from "@/content/facts";
import { SOURCES } from "@/content/sources";
import { StoryEntry } from "../story/StoryEntry";
import { SectionHead } from "./Section";
import { Tensed } from "./Tensed";

const LINK = "text-open underline underline-offset-2 hover:text-fg";

/** The Facts tab: fact tiles, race week, watch and follow, and every source.
 *  A server component. */
export function FactsTab() {
  return (
    <div className="space-y-7">
      <StoryEntry />
      <ul className="grid grid-cols-2 gap-2" data-testid="fact-tiles">
        {FACT_TILES.map((f) => (
          <li key={f.value} className="rounded-lg bg-panel-2 px-3 py-2.5">
            <b className="block font-display text-2xl font-bold leading-none text-fg">{f.value}</b>
            <span className="mt-1 block text-xs leading-snug text-muted">{f.text}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="week-title">
        <SectionHead id="week-title" title={FACTS_COPY.raceWeekTitle} />
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-soft">{FACTS_COPY.raceWeekZone}</p>
        <ul className="mt-2 divide-y divide-line" data-testid="race-week">
          {RACE_WEEK.map((d) => (
            <li key={d.day} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2 text-sm">
              <b className="font-semibold text-fg">{d.day}</b>
              <span className="text-muted">
                <Tensed text={d.text} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="watch-title">
        <SectionHead id="watch-title" title={FACTS_COPY.watchTitle} />
        <ul className="mt-2 space-y-2 text-sm text-muted">
          {WATCH.lines.map((line) => (
            <li key={line.text.future}>
              <Tensed text={line.text} />
            </li>
          ))}
          {WATCH.links.map((link) => (
            <li key={link.href}>
              {link.label}{" "}
              <a className={LINK} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-title">
        <SectionHead id="sources-title" title={FACTS_COPY.sourcesTitle} caption={FACTS_COPY.sourcesCaption} />
        <ol className="mt-3 space-y-2" data-testid="sources">
          {SOURCES.map((s) => (
            <li key={s.id} id={`source-${s.id}`} className="grid grid-cols-[2.25rem_1fr] gap-2 text-xs">
              <span className="font-mono text-soft">{s.id}</span>
              <span className="min-w-0">
                <a className={`${LINK} break-words`} href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
                <span className="block text-soft">{FACTS_COPY.source(s.publisher, s.date)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-soft">{DATA_CREDITS.text}</p>
      </section>
    </div>
  );
}
