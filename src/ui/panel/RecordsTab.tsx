import { RECORD_BOOK, RECORD_HERO, RECORDS_COPY, WORLD_RECORDS, WORLD_RECORDS_COPY } from "@/content/records";
import { SectionHead } from "./Section";

/** The Records tab: the men's world record, the record book and the seven
 *  world records set on these streets. A server component. */
export function RecordsTab() {
  return (
    <div className="space-y-7">
      <section aria-labelledby="hero-title" className="rounded-panel bg-panel-2 px-4 py-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{RECORD_HERO.eyebrow}</p>
        <h3 id="hero-title" className="mt-1 font-display text-5xl font-bold leading-none text-leader-wr">
          {RECORD_HERO.time}
        </h3>
        <p className="mt-2 text-sm text-muted">
          <b className="text-fg">{RECORD_HERO.name}</b> {RECORD_HERO.text}
        </p>
      </section>

      <section aria-labelledby="book-title">
        <SectionHead id="book-title" title={RECORDS_COPY.bookTitle} />
        <ul className="mt-3 divide-y divide-line" data-testid="record-book">
          {RECORD_BOOK.map((r, i) => (
            <li key={r.time} className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5">
              <b className="font-display text-xl font-bold leading-tight text-fg">{r.time}</b>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{r.title}</span>
                <span className="block text-xs text-muted">{r.text}</span>
                {i === 1 && <span className="mt-1 block text-[11px] leading-snug text-soft">{RECORDS_COPY.chepngetichNote}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="wr-title">
        <SectionHead id="wr-title" title={WORLD_RECORDS_COPY.title} caption={WORLD_RECORDS_COPY.caption} />
        <ul className="mt-3 space-y-1" data-testid="world-records">
          {WORLD_RECORDS.map((r) => (
            <li key={r.year} className="grid grid-cols-[2.75rem_0.75rem_1fr_auto] items-center gap-2 py-1.5">
              <span className="font-mono text-xs text-muted">{r.year}</span>
              <i aria-hidden="true" className={`size-2.5 rounded-full ${r.women ? "bg-leader-wom" : "bg-leader-men"}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{r.name}</span>
                <span className="block truncate text-[11px] text-soft">{r.country}</span>
              </span>
              <b className="font-display text-lg font-bold text-fg">{r.time}</b>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{WORLD_RECORDS_COPY.legend}</p>
      </section>
    </div>
  );
}
