"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/content/copy";
import { SPOT_COPY } from "@/content/spot";
import { sheetSnap } from "@/ui/panel/sheet-state";
import { locate, revealSpot, setPicking, spot } from "@/ui/spot";
import { SPOT_BUTTON } from "@/ui/spot/SpotViews";
import { PHONE_QUERY } from "@/ui/use-media";
import { useStore } from "@/ui/use-store";
import { FitIcon, MinusIcon, PinIcon, PlusIcon, RecenterIcon } from "./map-icons";
import type { MapEngine } from "./engine";

// One card, as v1's: the buttons share it with a hairline between them (the card's line color
// showing through a 1 px gap). The focus ring is drawn inside each button, where the card's
// rounded clip cannot cut it off.
const BUTTON =
  "grid size-11 place-items-center bg-panel text-fg pressable hover:bg-panel-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-open";

/** Zoom, fit-the-course and Drop a pin, floating on the right of the map (left of the
 *  panel slot), with Recenter above them while the course is out of view. Loaded with
 *  the map engine: they only exist for MapLibre. */
export default function MapControls({ engine, courseInView }: { engine: MapEngine; courseInView: boolean }) {
  const s = useStore(spot);
  // A location fix asked for from the map's note: its outcome shows there too.
  const [asked, setAsked] = useState(false);
  const togglePin = () => {
    setAsked(false);
    setPicking(!s.picking);
    // On phones the sheet steps aside so the map can be tapped (v1).
    if (!s.picking && window.matchMedia(PHONE_QUERY).matches) sheetSnap.set("peek");
  };
  return (
    <>
      <div className="pointer-events-none absolute right-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+5.5rem)] flex flex-col items-end gap-2 sm:right-5 md:top-1/2 md:right-[calc(var(--panel-reserve)+0.75rem)] md:-translate-y-1/2">
        {!courseInView && (
          <button
            type="button"
            onClick={() => engine.fitCourse(true)}
            className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-fg px-4 text-sm font-semibold text-bg shadow-lg pressable hover:brightness-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open"
          >
            <RecenterIcon />
            {COPY.recenter}
          </button>
        )}
        {/* Only the card is a right inset: the Recenter pill comes and goes. One column from
            768 px; on phones a 2 x 2 grid (zoom in and out, then fit and pin), which keeps the
            card clear of the dock when a short phone's sheet is at half (owner, 2026-10-09:
            zoom buttons on phones too). */}
        <div
          data-map-inset="right"
          className="pointer-events-auto grid gap-px overflow-hidden rounded-panel bg-line shadow-lg ring-1 ring-line max-md:grid-flow-col max-md:grid-rows-2"
        >
          <button type="button" aria-label={COPY.zoomIn} onClick={() => engine.zoomBy(1)} className={BUTTON}>
            <PlusIcon />
          </button>
          <button type="button" aria-label={COPY.zoomOut} onClick={() => engine.zoomBy(-1)} className={BUTTON}>
            <MinusIcon />
          </button>
          <button type="button" aria-label={COPY.fitCourse} onClick={() => engine.fitCourse(true)} className={BUTTON}>
            <FitIcon />
          </button>
          <button
            type="button"
            aria-label={SPOT_COPY.mapButton}
            aria-pressed={s.picking}
            onClick={togglePin}
            className={`${BUTTON} aria-pressed:bg-leader-you aria-pressed:hover:brightness-110`}
            data-testid="map-pin-button"
          >
            <PinIcon />
          </button>
        </div>
      </div>
      <PinNote asked={asked} setAsked={setAsked} />
    </>
  );
}

/** The note on the map while a pin is being dropped (v1's hint): tap the map, or use one
 *  location fix instead. A fix asked for here reports here, then shows the spot card. */
function PinNote({ asked, setAsked }: { asked: boolean; setAsked: (asked: boolean) => void }) {
  const s = useStore(spot);
  const finding = asked && s.locating === "asking";
  const notice = !asked ? null : s.locating === "denied" ? SPOT_COPY.denied : s.locating === "unavailable" ? SPOT_COPY.unavailable : null;

  // Escape cancels the pick.
  useEffect(() => {
    if (!s.picking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicking(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.picking]);

  const findMe = () => {
    setAsked(true);
    const before = spot.get().pin;
    const stop = spot.subscribe(() => {
      const now = spot.get();
      if (now.locating === "asking") return;
      stop();
      if (now.pin && now.pin !== before && now.from === "location") revealSpot();
    });
    locate();
  };

  const text = s.picking ? SPOT_COPY.picking : finding ? SPOT_COPY.locating : notice;
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+5.5rem)] z-20 flex justify-center max-md:right-28 md:top-36 md:right-(--panel-reserve)"
    >
      {text && (
        <div className="pointer-events-auto flex max-w-md flex-col items-center gap-2 rounded-panel bg-panel px-4 py-3 text-center text-sm text-fg shadow-lg ring-1 ring-line" data-testid="pin-note">
          <p className="font-semibold">{text}</p>
          {(s.picking || notice) && (
            <div className="flex flex-wrap justify-center gap-2">
              {s.picking ? (
                <button type="button" onClick={findMe} className={SPOT_BUTTON}>
                  {SPOT_COPY.locate}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAsked(false);
                    setPicking(true);
                  }}
                  className={SPOT_BUTTON}
                >
                  {SPOT_COPY.drop}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (s.picking) setPicking(false);
                  else setAsked(false);
                }}
                className={SPOT_BUTTON}
              >
                {s.picking ? SPOT_COPY.cancel : SPOT_COPY.dismiss}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
