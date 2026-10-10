import { RESULTS, type RaceResults } from "@/content/results";
import { SectionHead } from "./Section";

/** The results slot: nothing until src/content/results.ts is filled in. */
export function ResultsSlot({ results = RESULTS }: { results?: RaceResults | null }) {
  if (!results) return null;
  return (
    <section aria-labelledby="results-title" data-testid="results">
      <SectionHead id="results-title" title={results.title} caption={results.asOf} />
      <ul className="mt-3 divide-y divide-line">
        {results.rows.map((r) => (
          <li key={`${r.category}-${r.name}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block text-xs text-muted">{r.category}</span>
              <span className="font-semibold text-fg">{r.name}</span> <span className="text-muted">({r.country})</span>
            </span>
            <b className="shrink-0 font-display text-xl font-bold text-fg">{r.time}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
