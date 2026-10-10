import { PANEL_COPY } from "@/content/panel-copy";
import { ClosureSummary } from "../ClosureSummary";
import { Disclaimer } from "../Disclaimer";
import { FactsTab } from "./FactsTab";
import { PanelTabs } from "./PanelTabs";
import { RaceTab } from "./RaceTab";
import { RecordsTab } from "./RecordsTab";
import { StreetsTab } from "./StreetsTab";
import { Upgrade } from "../Upgrade";

/** The panel: a bottom sheet on phones (snap points from main[data-snap],
 *  styles in globals.css), a 340 px side panel on tablets and 380 px on desktops.
 *  Prerendered in full; the interaction layer adds drag, tabs and live state. */
export function Panel() {
  return (
    <aside
      data-testid="panel"
      aria-label={PANEL_COPY.label}
      className="sheet fixed inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[20px] bg-panel shadow-2xl ring-1 ring-line md:absolute md:inset-x-auto md:inset-y-(--panel-gap) md:right-(--panel-gap) md:w-(--panel-width) md:rounded-panel"
    >
      {/* The sheet's head (handle, summary, tab bar) drags the sheet on phones; the browser does not pan it. */}
      <div data-sheet-handle className="flex h-5 shrink-0 cursor-grab items-center justify-center max-md:touch-none md:hidden active:[&>span]:bg-muted">
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
      </div>
      <div data-sheet-summary className="shrink-0 px-4 pb-3 max-md:touch-none md:pt-4">
        <ClosureSummary />
      </div>
      <PanelTabs
        panels={{ streets: <StreetsTab />, race: <RaceTab />, records: <RecordsTab />, facts: <FactsTab /> }}
        footer={
          <div className="mt-6 md:hidden">
            <Disclaimer />
          </div>
        }
      />
      <Upgrade name="sheet">{null}</Upgrade>
    </aside>
  );
}
