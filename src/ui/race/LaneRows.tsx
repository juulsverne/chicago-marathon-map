import { LANES, LANES_COPY, type LaneTone } from "@/content/race-day";
import { hoursMinutes, laneFraction, laneMiles } from "./lanes";

const TONE: Readonly<Record<LaneTone, string>> = {
  wr: "bg-leader-wr",
  men: "bg-leader-men",
  wom: "bg-leader-wom",
  typical: "bg-soft",
  you: "bg-leader-you",
};

/** "When Sawe finished, where was everyone?" (v1's lanes): how far each runner has gone
 *  when the 1:59:30 world record finishes. `youMinutes` is the "Your marathon time"
 *  slider. Shared by the prerendered tab and the live one (PaceLive). */
export function LaneRows({ youMinutes }: { youMinutes: number }) {
  return (
    <ul className="space-y-2.5" data-testid="lanes">
      {LANES.map((lane) => {
        const finish = lane.tone === "you" ? youMinutes : lane.finish;
        const sub = lane.tone === "you" || lane.tone === "typical" ? LANES_COPY.finish(hoursMinutes(finish)) : lane.sub;
        const f = laneFraction(finish);
        return (
          <li key={lane.name} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2" data-lane={lane.tone}>
            <span className="min-w-0 leading-tight">
              <span className={`block truncate text-xs font-semibold ${lane.tone === "you" ? "text-leader-you" : "text-fg"}`}>{lane.name}</span>
              <span className="block truncate text-[11px] text-soft">{sub}</span>
            </span>
            <span className="relative h-2 rounded-full bg-panel-2">
              <span className={`lane-fill absolute inset-y-0 left-0 rounded-full opacity-30 ${TONE[lane.tone]}`} style={{ width: `${f * 100}%` }} />
              <span className={`lane-dot absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel ${TONE[lane.tone]}`} style={{ left: `${f * 100}%` }} />
            </span>
            <span className="text-right font-mono text-[11px] text-muted">{LANES_COPY.miles(laneMiles(finish))}</span>
          </li>
        );
      })}
      <li aria-hidden="true" className="grid grid-cols-[7.5rem_1fr_3rem] gap-2 font-mono text-[10px] text-soft">
        <span />
        <span className="flex justify-between">
          {LANES_COPY.axis.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </span>
        <span />
      </li>
    </ul>
  );
}
