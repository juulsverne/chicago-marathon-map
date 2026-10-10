"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { EVENTS } from "@/content/events";
import { JUMP_COPY } from "@/content/race-day";
import { DURATION, EASING, cssEasing, seconds } from "@/motion/tokens";
import { formatClock } from "@/model/time";
import { useClock, useRaceClock } from "../clock-context";
import { jumpToast, showJump } from "../jump-toast";
import { leaderSettings, shownLeaders } from "../leader-settings";
import { modelRunners, statsAt } from "../model-stats";
import { sheetSnap } from "../panel/sheet-state";
import { PHONE_QUERY } from "../use-media";
import { useStore } from "../use-store";
import { AgendaItemBody, agendaStates } from "./AgendaItem";
import { BoardView, FieldView, HeadlineView, StatsView } from "./RaceSections";
import { boardRows, mileBins, raceClock, story } from "./race-view";

// The Race tab's live sections: they follow the clock at 10 Hz and replace
// the prerendered 5:50 AM versions with the same boxes.

const ROLL = { duration: DURATION.slow, easing: cssEasing(EASING.standard) };

export function LiveHeadline() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  const live = useClock((s) => s.live);
  const { head, sub } = story(minute, statsAt(minute), modelRunners());
  return <HeadlineView time={formatClock(minute)} live={live} head={head} sub={sub} />;
}

/** "Race day at a glance": tap a moment to jump there (paused), as v1 did; on phones the
 *  sheet lowers so the map shows. */
export function LiveAgenda() {
  const clock = useRaceClock();
  const minute = useClock((s) => Math.floor(s.t), 10);
  const states = agendaStates(EVENTS, minute);
  return (
    <ol className="mt-3 space-y-0.5" data-testid="agenda">
      {EVENTS.map((e, i) => (
        <li key={e.t} data-testid="agenda-item">
          <button
            type="button"
            data-state={states[i]}
            onClick={() => {
              clock.pause();
              clock.seek(e.t);
              showJump(e.t);
              if (window.matchMedia(PHONE_QUERY).matches) sheetSnap.set("peek");
            }}
            className="pressable group flex w-full items-start gap-3 rounded-lg px-1 py-2 text-left hover:bg-panel-2 data-[state=next]:bg-panel-2"
          >
            <AgendaItemBody event={e} state={states[i]} />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function LiveStats() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  // Digits roll only when the counts change slowly: paused, Live, or 1 min/s.
  const calm = useClock((s) => !s.playing || s.live || s.speed === 1);
  const stats = statsAt(minute);
  return (
    <StatsView
      on={stats.on}
      finished={stats.finished}
      waiting={stats.waiting}
      clock={raceClock(minute)}
      rolling={(value) => <NumberFlow value={value} locales="en-US" animated={calm} transformTiming={ROLL} spinTiming={ROLL} />}
    />
  );
}

export function LiveField() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  return <FieldView bins={mileBins(modelRunners(), minute)} />;
}

export function LiveBoard() {
  const minute = useClock((s) => Math.floor(s.t), 10);
  const settings = useStore(leaderSettings);
  return <BoardView rows={boardRows(shownLeaders(settings), minute)} />;
}

/** v1's toast after a jump: the moment's time, name and detail, for 5.2 s. */
export function JumpToast() {
  const jump = useStore(jumpToast);
  const [shown, setShown] = useState<typeof jump>(null);
  useEffect(() => {
    if (!jump) return;
    const show = setTimeout(() => setShown(jump), 0);
    const hide = setTimeout(() => setShown(null), 5200);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [jump]);
  const event = shown ? EVENTS.find((e) => e.t === shown.t) : undefined;
  return (
    <MotionConfig reducedMotion="user">
      <div
        role="status"
        className="pointer-events-none absolute inset-x-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+5.5rem)] z-20 flex justify-center max-md:right-28 md:top-36 md:right-(--panel-reserve)"
      >
        <AnimatePresence>
          {event && shown && (
            <motion.p
              key={shown.n}
              data-testid="jump-toast"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: seconds(DURATION.base), ease: EASING.standard }}
              className="max-w-md rounded-panel bg-panel px-4 py-2.5 text-sm text-fg shadow-lg ring-1 ring-line"
            >
              {JUMP_COPY.toast(event.at, event.name, event.detail)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
