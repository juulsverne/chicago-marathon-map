import { COPY } from "@/content/copy";
import { CourseSvg } from "@/map/CourseSvg";
import { MapNote } from "@/map/MapNote";
import { MapStage } from "@/map/MapStage";
import { ClockProvider } from "@/ui/clock-context";
import { ClockReadout } from "@/ui/ClockReadout";
import { Disclaimer } from "@/ui/Disclaimer";
import { Header } from "@/ui/Header";
import { MapKey } from "@/ui/map-key/MapKey";
import { Panel } from "@/ui/panel/Panel";
import { RunnerHistogram } from "@/ui/RunnerHistogram";
import { Timeline } from "@/ui/Timeline";
import { Upgrade } from "@/ui/Upgrade";

// data-map-inset marks the UI the map's fit padding keeps the course clear of.
// data-snap is the phone sheet's snap point; the sheet controller changes it.
export default function Page() {
  return (
    <ClockProvider>
      <main data-snap="peek" className="relative h-dvh w-full overflow-hidden bg-land">
        <MapStage map={<CourseSvg />}>
          {/* Header and clock on one row, the same height; from 768 px the row ends at the panel. */}
          <div
            data-map-inset="top"
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5 md:right-(--panel-reserve)"
          >
            <div className="flex items-stretch justify-between gap-2">
              <div className="pointer-events-auto min-w-0 max-w-sm flex-1">
                <Header mapKey={<MapKey />} />
              </div>
              <div className="pointer-events-auto shrink-0">
                <ClockReadout />
              </div>
            </div>
            <div className="pointer-events-auto flex max-w-sm flex-col gap-2">
              <MapNote />
              {/* The street card, from 768 px (src/ui/card/StreetCard.tsx). */}
              <div data-card-slot="wide" className="max-md:hidden" />
            </div>
          </div>
          {/* The panel's footprint for the map's fit padding (--panel-reserve, globals.css). */}
          <div
            aria-hidden="true"
            data-map-inset="right"
            data-testid="panel-slot"
            className="pointer-events-none absolute inset-y-0 right-0 hidden md:block md:w-(--panel-reserve)"
          />
          {/* The timeline dock: at the bottom from 768 px; on phones it rides above the sheet. */}
          <section
            aria-label={COPY.timelineLabel}
            className="rides-sheet pointer-events-none absolute bottom-0 left-0 right-0 p-3 sm:p-5 max-md:pb-3 md:right-(--panel-reserve) md:pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* The street card on phones, riding above the dock. */}
            <div data-card-slot="phone" className="mb-2 md:hidden" />
            <div
              data-map-inset="bottom"
              className="pointer-events-auto mx-auto max-w-3xl space-y-3 rounded-panel bg-panel/95 p-3 shadow-lg ring-1 ring-line sm:p-4"
              data-testid="timeline-panel"
            >
              <Timeline histogram={<RunnerHistogram />} />
              <Disclaimer />
            </div>
          </section>
          <Panel />
          <Upgrade name="card">{null}</Upgrade>
          <Upgrade name="mapLink">{null}</Upgrade>
          <Upgrade name="sharedStreet">{null}</Upgrade>
          <Upgrade name="toast">{null}</Upgrade>
          <Upgrade name="storyHost">{null}</Upgrade>
        </MapStage>
      </main>
    </ClockProvider>
  );
}
