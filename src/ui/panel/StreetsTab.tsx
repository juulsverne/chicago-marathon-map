import { OPENING_TIME } from "@/content/race";
import { STREETS_COPY } from "@/content/streets";
import { SpotStatic } from "../spot/SpotViews";
import { StreetCellsView } from "../streets/StreetCells";
import { StaticStreetList } from "../streets/StreetList";
import { StoryEntry } from "../story/StoryEntry";
import { Upgrade } from "../Upgrade";

// Waiting, runners, final runners, open: v1's proportions, with text kept above 4.5:1.
const PHASE_STYLE = [
  "flex-[1.1] bg-closed/25 text-fg",
  "flex-[1.4] bg-closed text-bg",
  "flex-[0.9] bg-closed/25 text-fg",
  "flex-[0.8] bg-open text-bg",
];

/** The Streets tab: the course strip, how every closure works, and the 41
 *  closures. A server component: all of it is in the prerendered HTML. */
export function StreetsTab() {
  const { cells, lifecycle, list, footer } = STREETS_COPY;
  return (
    <div className="space-y-7">
      <Upgrade name="spot">
        <SpotStatic />
      </Upgrade>
      <section aria-label={cells.label} className="rounded-panel bg-panel-2 p-4">
        <Upgrade name="streetCells">
          <StreetCellsView minute={OPENING_TIME} />
        </Upgrade>
        <div aria-hidden="true" className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>{cells.start}</span>
          <span>{cells.finish}</span>
        </div>
        <p className="mt-1.5 text-xs text-muted">{cells.caption}</p>
      </section>

      <section aria-labelledby="lifecycle-title">
        <h3 id="lifecycle-title" className="font-display text-lg font-bold uppercase tracking-wide">
          {lifecycle.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{lifecycle.body}</p>
        <div className="mt-3 flex h-9 gap-[2px] overflow-hidden rounded-md text-[10.5px] font-bold uppercase tracking-wider">
          {lifecycle.phases.map((phase, i) => (
            <span key={phase} className={`flex items-center justify-center px-1 text-center leading-tight ${PHASE_STYLE[i]}`}>
              {phase}
            </span>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-soft">
          {lifecycle.marks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </section>

      <section aria-labelledby="closures-title">
        <h3 id="closures-title" className="font-display text-lg font-bold uppercase tracking-wide">
          {list.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{list.caption}</p>
        <Upgrade name="streetList">
          <div data-street-search className="mt-3">
            <input
              type="search"
              aria-label={list.searchLabel}
              placeholder={list.searchPlaceholder}
              className="h-11 w-full rounded-lg bg-panel-2 px-3 text-sm text-fg ring-1 ring-line placeholder:text-soft"
            />
          </div>
          <div className="mt-3">
            <StaticStreetList />
          </div>
        </Upgrade>
        <p className="mt-3 text-xs text-soft">{list.timesNote}</p>
      </section>

      <StoryEntry />
      <p className="text-xs leading-relaxed text-soft">{footer.text}</p>
    </div>
  );
}
