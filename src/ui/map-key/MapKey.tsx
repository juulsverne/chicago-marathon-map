import type { ReactNode } from "react";
import { KEY_COPY } from "@/content/map-key";
import { Upgrade } from "../Upgrade";
import { ClosedIcon, LeadersIcon, MileIcon, OpenIcon, PaceIcon, RecordIcon, RunnersIcon, ShadingIcon, SpotIcon, StartIcon } from "./key-icons";
import { KEY_ID, peoplePerDot } from "./map-key";

/** One entry: the symbol, then a bold label and the text that follows it (v1). */
function Entry({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-5 shrink-0 items-center">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

const Label = ({ children }: { children: ReactNode }) => <b className="font-semibold text-fg">{children}</b>;

/** The map key: collapsed everywhere, opened from a
 *  small "Key" button in the header. A server component on the browser's own popover,
 *  so it costs no first-load JavaScript and works before the interaction layer loads
 *  (and with JavaScript off): Escape or a tap outside closes it. The interaction layer
 *  closes it when a street is picked or a pin is being dropped, and fills in how many
 *  people a runner dot stands for at the device's quality tier. */
export function MapKey() {
  const k = KEY_COPY;
  return (
    <>
      <button
        type="button"
        popoverTarget={KEY_ID}
        className="pressable relative inline-flex h-6 items-center gap-1.5 rounded-full bg-panel-2 px-2.5 text-xs font-semibold leading-4 text-fg ring-1 ring-line before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-[''] hover:bg-line"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[1.6]">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7.2v4M8 4.6v.1" strokeLinecap="round" />
        </svg>
        {k.button}
      </button>
      {/* The popover sits in the top layer; it never sets `display` itself, or it would always show. */}
      <section
        id={KEY_ID}
        popover="auto"
        aria-labelledby={`${KEY_ID}-title`}
        data-testid="map-key"
        className="fixed inset-auto top-[calc(max(env(safe-area-inset-top),0.75rem)+5.5rem)] left-3 m-0 max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-panel border-0 bg-panel p-4 text-fg shadow-lg ring-1 ring-line sm:left-5 md:top-36 md:max-h-[calc(100dvh-10rem)]"
      >
        <h2 id={`${KEY_ID}-title`} className="font-display text-lg font-bold uppercase tracking-wide text-fg">
          {k.title}
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-5 text-muted">
          <Entry icon={<ClosedIcon />}>
            <Label>{k.closed.label}</Label>
            {k.closed.rest}
          </Entry>
          <Entry icon={<OpenIcon />}>
            <Label>{k.open.label}</Label>
            {k.open.rest}
          </Entry>
          <Entry icon={<RunnersIcon />}>
            <Upgrade name="keyRunners">
              <Label>{k.runners.label}</Label>
              {k.runners.rest(peoplePerDot("high"))}
            </Upgrade>
          </Entry>
          <Entry icon={<MileIcon />}>
            <Label>{k.mile.label}</Label>
            {k.mile.rest}
          </Entry>
          <Entry icon={<StartIcon />}>
            <Label>{k.startFinish.label}</Label>
            {k.startFinish.rest}
          </Entry>
          <Entry icon={<LeadersIcon />}>
            <Label>{k.leaders.label}</Label>
            {k.leaders.rest}
          </Entry>
          <Entry icon={<RecordIcon />}>
            <Label>{k.record.label}</Label>
            {k.record.rest}
          </Entry>
          <Entry icon={<PaceIcon />}>
            <Label>{k.pace.label}</Label>
            {k.pace.rest}
          </Entry>
          <Entry icon={<ShadingIcon />}>
            <Label>{k.shading.label}</Label>
            {k.shading.rest}
          </Entry>
          <Entry icon={<SpotIcon />}>
            <Label>{k.spot.label}</Label>
            {k.spot.rest}
          </Entry>
        </ul>
        <Upgrade name="keyDismiss">{null}</Upgrade>
      </section>
    </>
  );
}
