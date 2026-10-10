"use client";

import { CARD_COPY } from "@/content/card";
import { SPOT_COPY } from "@/content/spot";
import { distanceText, nearestClosure, walkMinutes } from "@/model/nearest";
import { ROUTE_LEN, SEGMENTS } from "@/model/course";
import { arrivalTimes } from "@/model/runners";
import { formatClock } from "@/model/time";
import { modelRunners } from "../model-stats";
import { sheetSnap } from "../panel/sheet-state";
import { selectSegment } from "../selection";
import { locate, setPicking, setPin, spot } from "../spot";
import { PHONE_QUERY } from "../use-media";
import { useStore } from "../use-store";
import { SPOT_BUTTON, SPOT_PRIMARY, SpotFrame } from "./SpotViews";

/** Check your spot, live: drop a pin by tapping the map, or use one location
 *  fix; the card names the nearest closure, when runners pass that point and when the
 *  street reopens. */
export function SpotCard() {
  const s = useStore(spot);
  const near = s.pin ? nearestClosure(s.pin) : null;
  const pick = () => {
    setPicking(true);
    // On phones the sheet steps aside so the map can be tapped (v1).
    if (window.matchMedia(PHONE_QUERY).matches) sheetSnap.set("peek");
  };
  const locating = s.locating === "asking";
  const locateButton = (
    <button type="button" onClick={() => locate()} disabled={locating} className={SPOT_BUTTON} aria-busy={locating}>
      {locating ? SPOT_COPY.locating : SPOT_COPY.locate}
    </button>
  );
  const notice = s.locating === "denied" ? SPOT_COPY.denied : s.locating === "unavailable" ? SPOT_COPY.unavailable : null;

  return (
    <SpotFrame pinned={s.pin !== null}>
      <h3 id="spot-title" className="font-display text-lg font-bold uppercase tracking-wide text-fg">
        {s.pin ? SPOT_COPY.yours : SPOT_COPY.title}
      </h3>
      {s.picking ? (
        <>
          <p className="mt-1 text-sm font-semibold text-fg" role="status">
            {SPOT_COPY.picking}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setPicking(false)} className={SPOT_BUTTON}>
              {SPOT_COPY.cancel}
            </button>
          </div>
        </>
      ) : s.pin && near ? (
        <>
          <div role="status" data-testid="spot-result">
            {near.kind === "outside" && <p className="mt-1 text-sm text-fg">{SPOT_COPY.outside}</p>}
            {near.kind === "far" && <p className="mt-1 text-sm text-fg">{SPOT_COPY.far}</p>}
            {near.kind === "near" && <SpotResult near={near} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={pick} className={SPOT_BUTTON}>
              {SPOT_COPY.move}
            </button>
            <button type="button" onClick={() => setPin(null)} className={SPOT_BUTTON}>
              {SPOT_COPY.clear}
            </button>
            {locateButton}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">{SPOT_COPY.intro}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={pick} className={SPOT_PRIMARY}>
              {SPOT_COPY.drop}
            </button>
            {locateButton}
          </div>
        </>
      )}
      {notice && (
        <p className="mt-2 text-sm text-fg" role="alert">
          {notice}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">{SPOT_COPY.private}</p>
    </SpotFrame>
  );
}

function SpotResult({ near }: { near: Extract<ReturnType<typeof nearestClosure>, { kind: "near" }> }) {
  const seg = SEGMENTS[near.index];
  const times = arrivalTimes(modelRunners(), near.along, ROUTE_LEN);
  const rows = [
    { label: CARD_COPY.wheelchair, value: CARD_COPY.approx(formatClock(times.first)) },
    { label: CARD_COPY.elite, value: CARD_COPY.approx(formatClock(times.lead)) },
    { label: CARD_COPY.crowd, value: CARD_COPY.approx(formatClock(times.peak)) },
    { label: CARD_COPY.last, value: CARD_COPY.approx(formatClock(times.last)) },
  ];
  return (
    <>
      <p className="mt-1 text-sm text-fg">{SPOT_COPY.nearest(seg.street, seg.range, distanceText(near.distance), walkMinutes(near.distance))}</p>
      <button
        type="button"
        onClick={() => selectSegment(seg.index, "spot")}
        className="pressable mt-2 flex w-full items-center gap-2 rounded-lg bg-panel-2 px-3 py-2 text-left text-sm hover:ring-1 hover:ring-line"
      >
        <i aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-closed" />
        <span className="min-w-0 flex-1">
          <b className="font-semibold text-fg">{seg.street}</b>{" "}
          <span className="text-muted">{seg.finishArea ? SPOT_COPY.finishWindow : SPOT_COPY.closedWindow(formatClock(seg.reopensAt as number))}</span>
        </span>
      </button>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">{SPOT_COPY.times}</p>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="text-right font-mono text-xs leading-5 text-fg">{r.value}</dd>
          </div>
        ))}
      </dl>
      {near.others.length > 0 && (
        <>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">{SPOT_COPY.others}</p>
          <ul className="mt-1 space-y-1">
            {near.others.map((o) => {
              const other = SEGMENTS[o.index];
              return (
                <li key={o.index}>
                  <button type="button" onClick={() => selectSegment(o.index, "spot")} className="pressable w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel-2">
                    <b className="font-semibold text-fg">{other.street}</b>{" "}
                    <span className="text-xs text-muted">{SPOT_COPY.otherRow(other.range, distanceText(o.distance))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
