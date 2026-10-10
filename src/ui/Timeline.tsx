"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { COPY } from "@/content/copy";
import { DAY_END, DAY_START, OPENING_TIME } from "@/content/race";
import { nextSpeed } from "@/model/clock";
import { dateMode } from "@/model/date-mode";
import { formatClock, formatShort } from "@/model/time";
import { cancelChoreography } from "./choreography";
import { useClock, useRaceClock } from "./clock-context";
import { subscribeToDateChanges } from "./date-subscription";
import { PauseIcon, PlayIcon } from "./icons";
import { MomentPills } from "./MomentPills";
import { MOMENTS, TONE_BG, timelineFraction } from "./moments";

const liveOfferedNow = () => {
  const mode = dateMode(new Date());
  return mode.kind === "raceday" && mode.liveOffered;
};

/** The hours labelled under the scrubber, every two from 6 AM to 6 PM (v1's axis). */
const HOURS = [360, 480, 600, 720, 840, 960, 1080];

/** Where minute `t` sits over the scrubber: the thumb's center travels 0.5rem in from each end. */
const along = (t: number) => `calc(0.5rem + (100% - 1rem) * ${timelineFraction(t)})`;

/** The timeline dock: play, the scrubber over the runner histogram with the key
 *  moments marked on it and the hours under it, Live, playback speed, then the
 *  key-moment pills. `histogram` is the server-rendered RunnerHistogram. */
export function Timeline({ histogram }: { histogram: ReactNode }) {
  const clock = useRaceClock();
  const playing = useClock((s) => s.playing);
  const live = useClock((s) => s.live);
  const speed = useClock((s) => s.speed);
  const liveOffered = useSyncExternalStore(subscribeToDateChanges, liveOfferedNow, () => false);
  const range = useRef<HTMLInputElement>(null);
  const scrubber = useRef<HTMLDivElement>(null);

  // The thumb follows the clock without re-rendering React. It moves on whole minutes, the same
  // floored minute the readout and the closures use, so the DOM and screen readers hear one change a minute.
  // --p (0 to 1) fills the baseline and the histogram red up to the thumb (globals.css).
  useEffect(() => {
    let shown = Number.NaN;
    const sync = () => {
      const el = range.current;
      if (!el) return;
      const minute = Math.floor(clock.getSnapshot().t);
      if (minute === shown) return;
      shown = minute;
      el.value = String(minute);
      el.setAttribute("aria-valuetext", `${formatClock(minute)} ${COPY.timeZone}`);
      scrubber.current?.style.setProperty("--p", String(timelineFraction(minute)));
    };
    sync();
    return clock.subscribe(sync);
  }, [clock]);

  return (
    // Any touch of the timeline cancels the opening camera choreography.
    <div className="space-y-2" onPointerDownCapture={cancelChoreography} onKeyDownCapture={cancelChoreography}>
      <div className="flex items-center gap-3">
        {/* With reduced motion the app opens paused, so Play grows a visible label;
            dark text on the red keeps that label above 4.5:1. */}
        <button
          type="button"
          onClick={() => clock.toggle()}
          aria-label={playing ? COPY.pause : COPY.play}
          className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-closed text-fg pressable hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open motion-reduce:text-bg"
          data-testid="play-button"
        >
          {playing ? (
            <PauseIcon />
          ) : (
            <>
              <PlayIcon />
              <span className="hidden pr-2 text-sm font-semibold motion-reduce:inline">{COPY.play}</span>
            </>
          )}
        </button>
        {/* The baseline runs 26 px down: the histogram and the moment lines stand on it, the
            thumb sits on it and the hours hang under it (v1's look). The range input is 44 px
            tall, centered on the baseline, so the whole bar is easy to grab. */}
        <div
          ref={scrubber}
          className="@container relative h-12 min-w-0 flex-1"
          style={{ "--p": timelineFraction(OPENING_TIME) } as CSSProperties}
        >
          {/* The thumb's center travels 0.5rem in from each end, so the overlays do too. */}
          <div className="pointer-events-none absolute inset-x-2 top-0 h-[26px]">{histogram}</div>
          {MOMENTS.map((m) => (
            <span
              key={m.t}
              aria-hidden="true"
              data-testid="moment-tick"
              className={`pointer-events-none absolute top-1 h-[21px] w-0.5 -translate-x-1/2 ${TONE_BG[m.dock.tone]}`}
              style={{ left: along(m.t) }}
            >
              <i className={`absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel ${TONE_BG[m.dock.tone]}`} />
            </span>
          ))}
          <div
            aria-hidden="true"
            data-testid="timeline-hours"
            className="pointer-events-none absolute inset-x-0 top-[34px] h-3 font-mono text-[10px] leading-3 text-muted"
          >
            {HOURS.map((t, i) => (
              // On a narrow bar every other hour drops out, and on the narrowest only the ends
              // stay, so the labels never touch.
              <span
                key={t}
                className={`absolute -translate-x-1/2 ${i % 2 ? "@max-[13rem]:hidden" : i % 6 ? "@max-[8rem]:hidden" : ""}`}
                style={{ left: along(t) }}
              >
                {formatShort(t)}
              </span>
            ))}
          </div>
          <input
            ref={range}
            type="range"
            min={DAY_START}
            max={DAY_END}
            step={1}
            defaultValue={OPENING_TIME}
            aria-label={COPY.scrubLabel}
            onInput={(e) => clock.seek(Number(e.currentTarget.value))}
            className="scrubber absolute inset-x-0 top-1 h-11 w-full"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {liveOffered && (
            <button
              type="button"
              aria-pressed={live}
              onClick={() => clock.setLive(!live)}
              className="pressable h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-line hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open aria-pressed:bg-closed aria-pressed:text-bg aria-pressed:ring-closed"
            >
              {COPY.live}
            </button>
          )}
          <button
            type="button"
            onClick={() => clock.setSpeed(nextSpeed(speed))}
            aria-label={COPY.speedLabel(speed)}
            className="pressable flex h-11 w-14 flex-col items-center justify-center rounded-lg leading-tight ring-1 ring-line hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open"
          >
            <small className="font-mono text-[10px] uppercase text-muted">{COPY.speedUnit}</small>{" "}
            <b className="font-mono text-sm">{COPY.speedValue(speed)}</b>
          </button>
        </div>
      </div>
      <MomentPills />
    </div>
  );
}
