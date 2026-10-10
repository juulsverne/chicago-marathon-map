import { CALCULATOR_COPY } from "@/content/race-day";
import { WAVES } from "@/content/race";
import { youWave } from "@/model/pace";
import { RECORD_MINUTES, hoursMinutes, leftToRun, pacePerMile } from "./lanes";

/** "Your marathon time" runs 2:30 to 6:30, as v1's slider did. */
export const YOU_MIN = 150;
export const YOU_MAX = 390;

/** "That is 10:18 per mile, likely in Wave 2. When Sawe crossed the line you would be at
 *  mile 11.6, with 2h 31m still to run." (v1's sentence; miles on its 26.219 scale). */
export function calculatorSentence(minutes: number): string {
  return CALCULATOR_COPY.sentence(pacePerMile(minutes), WAVES[youWave(minutes)].name, ((26.219 * RECORD_MINUTES) / minutes).toFixed(1), leftToRun(minutes));
}

export const fraction = (minutes: number) => (minutes - YOU_MIN) / (YOU_MAX - YOU_MIN);

const CHECK = "flex min-h-11 items-center gap-3 text-sm text-fg";

/** The prerendered calculator: the same boxes as the live one (Base UI's slider, in the
 *  interaction layer), at v1's 4:30 default, with world-record pace on. */
export function CalculatorStatic() {
  const minutes = 270;
  return (
    <div className="mt-4 rounded-lg bg-panel-2 p-3" data-testid="calculator">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-fg">{CALCULATOR_COPY.label}</span>
        <b className="font-mono text-sm text-fg">{hoursMinutes(minutes)}</b>
      </div>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line">
          <div className="absolute inset-y-0 left-0 rounded-full bg-leader-you" style={{ width: `${fraction(minutes) * 100}%` }} />
        </div>
        <div className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-2 ring-leader-you" style={{ left: `${fraction(minutes) * 100}%` }} />
      </div>
      <p className="text-xs leading-snug text-muted" data-testid="calculator-sentence">
        {calculatorSentence(minutes)}
      </p>
      <div className="mt-2">
        <label className={CHECK}>
          <input type="checkbox" className="size-5 accent-leader-you" />
          {CALCULATOR_COPY.showMine}
        </label>
        <label className={CHECK}>
          <input type="checkbox" defaultChecked className="size-5 accent-leader-wr" />
          {CALCULATOR_COPY.showRecord}
        </label>
      </div>
    </div>
  );
}
