"use client";

import { Slider } from "@base-ui/react/slider";
import { CALCULATOR_COPY } from "@/content/race-day";
import { leaderSettings } from "../leader-settings";
import { useStore } from "../use-store";
import { YOU_MAX, YOU_MIN, calculatorSentence } from "./Calculator";
import { LaneRows } from "./LaneRows";
import { hoursMinutes } from "./lanes";

const CHECK = "flex min-h-11 items-center gap-3 text-sm text-fg";

/** "When Sawe finished, where was everyone?" and "Your marathon time", live:
 *  the slider (Base UI) moves your lane and your pace marker on the map, and switches the
 *  marker on, as v1's did; the two boxes show or hide your pace and world-record pace. */
export function PaceLive() {
  const s = useStore(leaderSettings);
  return (
    <>
      <LaneRows youMinutes={s.youMinutes} />
      <div className="mt-4 rounded-lg bg-panel-2 p-3" data-testid="calculator">
        <Slider.Root
          value={s.youMinutes}
          min={YOU_MIN}
          max={YOU_MAX}
          step={1}
          largeStep={15}
          onValueChange={(value) => leaderSettings.set({ ...leaderSettings.get(), youMinutes: value, you: true })}
        >
          <div className="flex items-baseline justify-between">
            <Slider.Label className="text-sm font-semibold text-fg">{CALCULATOR_COPY.label}</Slider.Label>
            <b className="font-mono text-sm text-fg" aria-hidden="true">
              {hoursMinutes(s.youMinutes)}
            </b>
          </div>
          <Slider.Control className="relative flex h-11 touch-none items-center">
            <Slider.Track className="relative h-1.5 w-full rounded-full bg-line">
              <Slider.Indicator className="rounded-full bg-leader-you" />
              <Slider.Thumb
                getAriaValueText={(_formatted, value) => CALCULATOR_COPY.valueText(hoursMinutes(value))}
                className="pressable size-5 rounded-full bg-fg ring-2 ring-leader-you has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-open"
              />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
        <p className="text-xs leading-snug text-muted" data-testid="calculator-sentence">
          {calculatorSentence(s.youMinutes)}
        </p>
        <div className="mt-2">
          <label className={CHECK}>
            <input type="checkbox" checked={s.you} onChange={(e) => leaderSettings.set({ ...leaderSettings.get(), you: e.target.checked })} className="size-5 accent-leader-you" />
            {CALCULATOR_COPY.showMine}
          </label>
          <label className={CHECK}>
            <input type="checkbox" checked={s.wr} onChange={(e) => leaderSettings.set({ ...leaderSettings.get(), wr: e.target.checked })} className="size-5 accent-leader-wr" />
            {CALCULATOR_COPY.showRecord}
          </label>
        </div>
      </div>
    </>
  );
}
