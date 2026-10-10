"use client";

import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useMapOnScreen, useRaceClock } from "@/ui/clock-context";
import { choreographyCancelled } from "@/ui/choreography";
import { loadInteraction } from "@/ui/interaction-loader";
import type { MapEngine } from "./engine";
import { fitPadding, type Insets } from "./insets";
import { INITIAL_STAGE, StageContext, type StageState } from "./stage-context";
import { hasWebGL2 } from "./webgl";

/** performance.mark set right before MapLibre is requested (the JS budget test reads it). */
export const MAP_IMPORT_MARK = "cmm:map-import";
/** The opening's clock hold gives up after this long without a map (slow devices). */
const HOLD_LIMIT_MS = 6000;
/** The SVG cross-fades out over this long once MapLibre has drawn. */
const FADE_MS = 400;
// Loaded with the engine, so the controls cost nothing before the map exists.
const MapControls = lazy(() => import("./MapControls"));

const noSubscribe = () => () => {};

/** Runs `run` once the browser is idle after first paint; returns a cancel function. */
function afterFirstPaint(run: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(run, { timeout: 500 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(run, 100);
  return () => clearTimeout(id);
}

/** The edges of the UI over the map: elements marked data-map-inset="top", "bottom" or
 *  "right" (the header bar, the timeline dock, the controls, the panel slot), in px from
 *  the stage's top-left corner. */
function measureEdges(stage: HTMLElement) {
  const box = stage.getBoundingClientRect();
  const edges = { top: 0, bottom: box.height, right: box.width };
  for (const el of document.querySelectorAll<HTMLElement>("[data-map-inset]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const side = el.dataset.mapInset;
    if (side === "top") edges.top = Math.max(edges.top, r.bottom - box.top);
    else if (side === "bottom") edges.bottom = Math.min(edges.bottom, r.top - box.top);
    else if (side === "right") edges.right = Math.min(edges.right, r.left - box.left);
  }
  return { box, edges };
}

/** Fit padding from the UI over the map. */
function measurePadding(stage: HTMLElement): Insets {
  const { box, edges } = measureEdges(stage);
  return fitPadding({ width: box.width, height: box.height }, edges);
}

/** How far the UI over the map reaches in from each edge, exactly (for Recenter). */
function measureUncovered(stage: HTMLElement): Insets {
  const { box, edges } = measureEdges(stage);
  return { top: Math.max(0, edges.top), right: Math.max(0, box.width - edges.right), bottom: Math.max(0, box.height - edges.bottom), left: 0 };
}

/** The map and the UI over it. Shows `map` (the prerendered SVG course) first,
 *  loads MapLibre after first paint and cross-fades to it once it has drawn.
 *  `children` (header, dock, panel slot) render on top and can read the stage's
 *  state with useStage(). */
export function MapStage({ map, children }: { map: ReactNode; children: ReactNode }) {
  const clock = useRaceClock();
  const onScreen = useMapOnScreen();
  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<StageState>(INITIAL_STAGE);
  // False on the server and during hydration, true after: the data-ready marker.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);

  // The frame loop sleeps while the map is off screen.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => onScreen.set(entry.isIntersecting));
    observer.observe(stage);
    return () => {
      observer.disconnect();
      onScreen.set(true);
    };
  }, [onScreen]);

  useEffect(() => {
    let engine: MapEngine | null = null;
    let cancelled = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The opening choreography holds the clock at 5:50 from hydration until the
    // course has drawn in. Under automation it runs only when a test opts in, so other
    // tests start from the plain fitted view. Anything that cancels it releases the hold.
    const optedIn = !navigator.webdriver || (window as unknown as { __cmmCinema?: boolean }).__cmmCinema === true;
    const cinematic = !reducedMotion && optedIn && !choreographyCancelled.get();
    if (cinematic) clock.hold(true);
    const holdLimit = setTimeout(() => clock.hold(false), HOLD_LIMIT_MS);
    const unsubscribeCancel = choreographyCancelled.subscribe(() => {
      if (choreographyCancelled.get()) clock.hold(false);
    });

    // The SVG stays for good, with the quiet note: no WebGL2, a context that did not come back,
    // or an engine that did not load or start.
    const fallBack = () => {
      clock.hold(false);
      engine?.destroy();
      engine = null;
      clearTimeout(fadeTimer);
      setState((s) => ({ ...s, engine: "fallback", svgLive: true, tier: null, api: null }));
    };

    const start = async () => {
      // MapLibre 6 needs WebGL2. Without it, never download the engine: the SVG stays.
      if (!hasWebGL2()) {
        fallBack();
        loadInteraction();
        return;
      }
      try {
        performance.mark(MAP_IMPORT_MARK);
        const engineModule = import("./engine");
        // The interaction layer loads beside the engine, after first paint (src/ui/interaction-loader.ts).
        loadInteraction();
        const { startMapEngine } = await engineModule;
        const container = mapRef.current;
        const overlay = overlayRef.current;
        const stage = stageRef.current;
        if (cancelled || !container || !overlay || !stage) return;
        engine = startMapEngine({
          container,
          overlay,
          clock,
          reducedMotion,
          padding: () => measurePadding(stage),
          uncovered: () => measureUncovered(stage),
          cinematic,
          onReady: () => {
            clearTimeout(holdLimit);
            setState((s) => ({ ...s, engine: "map", svgLive: true, api: engine }));
            // Once the fade is over, the hidden SVG stops updating.
            fadeTimer = setTimeout(() => setState((s) => ({ ...s, svgLive: false })), reducedMotion ? 0 : FADE_MS);
          },
          onFallback: fallBack,
          onTier: (tier) => setState((s) => ({ ...s, tier })),
          onCourseInView: (courseInView) => setState((s) => (s.courseInView === courseInView ? s : { ...s, courseInView })),
        });
      } catch (error) {
        // The engine chunk did not load (offline, a blocked script) or the engine threw while starting.
        if (cancelled) return;
        if (typeof reportError === "function") reportError(error);
        else console.error(error);
        fallBack();
      }
    };

    const cancelStart = afterFirstPaint(() => void start());
    return () => {
      cancelled = true;
      cancelStart();
      clearTimeout(fadeTimer);
      clearTimeout(holdLimit);
      unsubscribeCancel();
      clock.hold(false);
      engine?.destroy();
      engine = null;
    };
  }, [clock]);

  return (
    <StageContext.Provider value={state}>
      <div
        ref={stageRef}
        className="map-stage absolute inset-0"
        data-testid="map-stage"
        data-engine={state.engine}
        data-tier={state.tier ?? undefined}
        data-ready={hydrated || undefined}
        data-map-ready={state.engine === "map" || undefined}
      >
        <div className="map-svg absolute inset-0">{map}</div>
        {/* MapLibre makes its container position: relative, so it fills a positioned wrapper. */}
        <div className="map-canvas absolute inset-0">
          <div ref={mapRef} className="h-full w-full" data-testid="map" />
          <div ref={overlayRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
        </div>
      </div>
      {children}
      {state.engine === "map" && state.api && (
        <Suspense fallback={null}>
          <MapControls engine={state.api} courseInView={state.courseInView} />
        </Suspense>
      )}
    </StageContext.Provider>
  );
}
