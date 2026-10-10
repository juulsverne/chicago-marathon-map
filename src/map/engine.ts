import "maplibre-gl/dist/maplibre-gl.css";
import { GPUInitializationError, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type MapMouseEvent, type SkySpecification } from "maplibre-gl";
import { COPY } from "@/content/copy";
import { LEADERS } from "@/content/race";
import type { RaceClock } from "@/model/clock";
import { isClosed } from "@/model/closures";
import { ROUTE_CUM, ROUTE_POINTS, SEGMENTS } from "@/model/course";
import { generateRunners } from "@/model/runners";
import { FrameGovernor } from "@/quality/governor";
import { TIERS, pixelRatioFor, readDeviceHints, startingTier, type Tier } from "@/quality/tiers";
import { WORKER_URL } from "./assets";
import { cancelChoreography, choreographyCancelled } from "@/ui/choreography";
import { rippleDelay } from "@/model/cinema";
import { OPENING_TIME, STREETS_CLOSE } from "@/content/race";
import { leaderSettings, shownLeaders } from "@/ui/leader-settings";
import { LAYOUT_EVENT } from "@/ui/layout-event";
import { COURSE_BOUNDS, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, courseInUncovered, segmentBounds, type LngLatPair } from "./camera";
import { Choreographer } from "./choreography";
import { ClosureTween } from "./closure-tween";
import { paletteAt, skyAt } from "./daylight";
import { paintTargets } from "./palette-apply";
import { CourseStateStore, type SegmentFlag } from "./course-state";
import type { Insets } from "./insets";
import { LeaderLabelOverlay } from "./leader-labels";
import { DAY } from "./palette";
import { buildRouteGeometry, buildRunnerField } from "./runner-field";
import { createRunnerLayer, type RunnerLayer } from "./runner-layer";
import { COURSE_SOURCE, RUNNER_BEFORE_LAYER, buildStyle } from "./style";

// The map engine. This module, and maplibre-gl with it, is only ever loaded by a
// dynamic import from MapStage, after first paint.

/** Closures fade between blue and red over this long. */
export const CLOSURE_TWEEN_MS = 400;
/** A lost WebGL context that is not back within this long falls back to the SVG. */
export const CONTEXT_RESTORE_MS = 2000;
const FIT_MS = 800;
const ZOOM_MS = 300;
/** A selected street: the camera eases to it, never closer than v1's Leaflet zoom 16.5. */
const SELECT_MS = 800;
const SELECT_MAX_ZOOM = 15.5;
/** Taps within this many CSS px of the course pick it (v1's click tolerance was 12 px). */
const TAP_SLOP_PX = 12;
const HOVER_SLOP_PX = 6;

/** A tap on the map: the course segment under it, if any, and where it landed. */
export type MapTap = Readonly<{ segment: number | null; lngLat: LngLatPair }>;

/** Check your spot on the map: the pin, and the nearest closure's point for the dashed line. */
export type MapSpot = Readonly<{ pin: LngLatPair; nearest: LngLatPair | null }>;
const SPOT_SOURCE = "spot";
const SPOT_LAYER = "spot-line";
type SpotData = { type: "FeatureCollection"; features: { type: "Feature"; properties: Record<string, never>; geometry: { type: "LineString"; coordinates: LngLatPair[] } }[] };
const NO_SPOT: SpotData = { type: "FeatureCollection", features: [] };
/** MapLibre's default sky (transparent), for tiers with the sky off. */
const NO_SKY: SkySpecification = { "sky-color": "transparent", "horizon-color": "transparent", "fog-color": "transparent", "fog-ground-blend": 1, "atmosphere-blend": 0 };

export type FallbackReason = "no-webgl2" | "context-lost";
export type { SegmentFlag };

export type EngineOptions = Readonly<{
  container: HTMLElement;
  /** An empty element over the map for the leader labels. */
  overlay: HTMLElement;
  clock: RaceClock;
  reducedMotion: boolean;
  /** Fit padding from the current layout, so the course clears the UI. */
  padding: () => Insets;
  /** How far the UI over the map reaches in from each edge (no gap, no cap): what Recenter checks. */
  uncovered: () => Insets;
  /** The style and data have loaded and the first frame is drawn. */
  onReady: () => void;
  /** MapLibre cannot run here; the stage switches to the SVG renderer. */
  onFallback: (reason: FallbackReason) => void;
  /** The quality tier, at start and whenever the governor changes it. */
  onTier: (tier: Tier) => void;
  /** After every camera move: whether any of the course is on screen. */
  onCourseInView: (inView: boolean) => void;
  /** Run the opening choreography: the stage decided it applies and is
   *  holding the clock at 5:50 for it. The engine releases the hold when it cannot. */
  cinematic: boolean;
}>;

/** What the map controls can ask of the running engine. */
export type MapEngine = Readonly<{
  fitCourse: (animate: boolean) => void;
  zoomBy: (delta: number) => void;
  /** Sets one flag on one course segment (the style draws the selection halo and the hover
   *  tint from it). Only sets the flag it is told: one-at-a-time selection is the caller's.
   *  Safe at any moment, including while the WebGL context is lost: the flag is kept and
   *  put back on the rebuilt map. */
  setSegmentFlag: (index: number, flag: SegmentFlag, on: boolean) => void;
  /** Eases the camera to one segment (instantly with reduced motion), clear of the UI. */
  fitSegment: (index: number) => void;
  /** Calls `listener` for every tap on the map; returns an unsubscribe. */
  onTap: (listener: (tap: MapTap) => void) => () => void;
  /** Draws (or, with null, removes) the pinned spot and its dashed line to the nearest
   *  closure; returns the pin's graphic, for its landing animation. */
  setSpot: (spot: MapSpot | null) => HTMLElement | null;
  /** While picking a spot the cursor is a crosshair. */
  setPicking: (on: boolean) => void;
  /** Eases the camera to centre a point (instantly with reduced motion). */
  centerOn: (lngLat: LngLatPair) => void;
  destroy: () => void;
}>;

declare global {
  interface Window {
    /** Test hook, set only under automation (navigator.webdriver is true in Playwright). */
    __cmm?: { map: MapLibreMap; runners: RunnerLayer; engine: MapEngine };
  }
}

export function startMapEngine(o: EngineOptions): MapEngine | null {
  setWorkerUrl(WORKER_URL);
  // Quality: the tier sets the pixel ratio and how many runners draw.
  let tier = startingTier(readDeviceHints(navigator));
  o.onTier(tier);
  let map: MapLibreMap;
  try {
    map = new MapLibreMap({
      container: o.container,
      style: {
        ...buildStyle({ origin: window.location.origin, palette: paletteAt(o.clock.getSnapshot().t) }),
        transition: { duration: o.reducedMotion ? 0 : 250, delay: 0 },
      },
      bounds: COURSE_BOUNDS,
      fitBoundsOptions: { padding: o.padding() },
      maxBounds: MAX_BOUNDS,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      pixelRatio: pixelRatioFor(tier, window.devicePixelRatio),
      attributionControl: false,
      renderWorldCopies: false,
      validateStyle: false, // tests/unit/style.test.ts validates the style instead
      fadeDuration: o.reducedMotion ? 0 : 300,
    });
  } catch (error) {
    // MapLibre 6 throws this synchronously when WebGL2 is missing.
    if (error instanceof GPUInitializationError) {
      o.onFallback("no-webgl2");
      return null;
    }
    throw error;
  }
  map.getCanvas().setAttribute("aria-label", COPY.mapLabel);

  // Course state: the engine owns every segment's `closed`, `selected` and `hover`, and
  // is the only writer of the map's feature-state. MapLibre has no style (so no
  // feature-state, and a throwing setFeatureState) from a WebGL context loss until the
  // rebuilt style has loaded, so writes wait for the store to be ready and the whole
  // state goes back at once when it is.
  const courseState = new CourseStateStore(SEGMENTS.length, (id, state) => map.setFeatureState({ source: COURSE_SOURCE, id }, state));
  // Closures: `closed` runs 0 (open) .. 1 (closed), tweened while a change is in flight;
  // the style interpolates the color.
  const tween = new ClosureTween(SEGMENTS.length, o.reducedMotion ? 0 : CLOSURE_TWEEN_MS);
  const closedAt = (t: number) => (i: number) => isClosed(SEGMENTS[i], t);
  let tweening = false;
  const applyClosures = (now: number) => {
    tweening = tween.step(now, (id, closed) => courseState.setClosed(id, closed));
  };

  // Light through the day: the palette follows the race clock, applied at most
  // four times a second and only where a color changed; the sky (seen when the camera is
  // pitched) follows the tier: on, simplified (no fog), or off.
  const applied = new Map<string, string>();
  let skyKey = "";
  let lightAt = 0;
  let lightTimer: ReturnType<typeof setTimeout> | undefined;
  const applyLight = (now: number, force = false) => {
    clearTimeout(lightTimer);
    if (!force && now - lightAt < 250) {
      // A trailing update, so a single seek while paused still lands its light.
      lightTimer = setTimeout(() => applyLight(performance.now(), true), 250 - (now - lightAt));
      return;
    }
    lightAt = now;
    const t = o.clock.getSnapshot().t;
    for (const [layer, property, color] of paintTargets(paletteAt(t))) {
      const key = layer + " " + property;
      if (applied.get(key) === color) continue;
      applied.set(key, color);
      if (map.getLayer(layer)) map.setPaintProperty(layer, property as Parameters<MapLibreMap["setPaintProperty"]>[1], color);
    }
    const mode = TIERS[tier].sky;
    const fog = mode === "on";
    // Off is MapLibre's own default: a transparent sky (src/style/sky.ts).
    const sky =
      mode === "off"
        ? NO_SKY
        : { ...skyAt(t), "sky-horizon-blend": 0.6, "horizon-fog-blend": fog ? 0.5 : 0, "fog-ground-blend": fog ? 0.4 : 0, "atmosphere-blend": 0 };
    const key = JSON.stringify(sky);
    if (key === skyKey) return;
    if (skyKey !== "" || mode !== "off") map.setSky(sky);
    skyKey = key;
  };

  // Runners and leaders: one custom WebGL layer above the course; leader names are DOM.
  // Every leader gets a label; only the drawn ones show. "Show my pace" and world-record
  // pace change the drawn set (src/ui/leader-settings.ts), so the layer reads it per frame.
  const labels = new LeaderLabelOverlay(o.overlay, LEADERS);
  const runners = createRunnerLayer({
    field: buildRunnerField(generateRunners()),
    geom: buildRouteGeometry(ROUTE_POINTS, ROUTE_CUM),
    palette: DAY,
    time: () => o.clock.getSnapshot().t,
    count: () => TIERS[tier].runners,
    leaders: () => shownLeaders(leaderSettings.get()),
    onLeaders: (points, zoom) => labels.update(points, zoom),
  });

  // The frame-time governor measures replay playback only (Live ticks once a
  // second), outside camera moves, while the tab is visible. MapLibre's render
  // event feeds it: one event per drawn frame.
  let governor: FrameGovernor | null = null;
  let measuring = false;
  let moving = false;
  const updateMeasuring = () => {
    const s = o.clock.getSnapshot();
    const next = governor !== null && s.playing && !s.live && !moving && !document.hidden;
    if (next === measuring) return;
    measuring = next;
    if (next) governor?.resume();
    else governor?.pause();
  };
  const setTier = (next: Tier) => {
    tier = next;
    map.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
    o.onTier(tier);
  };
  const onMoveStart = () => {
    moving = true;
    updateMeasuring();
  };
  // Recenter shows while no stretch of the course is on the map area the UI leaves uncovered;
  // checked after every camera move and whenever that UI settles into a new layout.
  const checkView = () => {
    const canvas = map.getCanvas();
    o.onCourseInView(courseInUncovered((lngLat) => map.project(lngLat), canvas.clientWidth, canvas.clientHeight, o.uncovered()));
  };
  const onMoveEnd = () => {
    moving = false;
    updateMeasuring();
    checkView();
  };
  window.addEventListener(LAYOUT_EVENT, checkView);
  document.addEventListener("visibilitychange", updateMeasuring);

  // The clock's requestAnimationFrame loop (src/ui/clock-loop.ts) is the only
  // app-level frame loop: each clock change asks MapLibre for one more frame.
  let lastT = o.clock.getSnapshot().t;
  const onClock = () => {
    const now = performance.now();
    updateMeasuring();
    const t = o.clock.getSnapshot().t;
    // At 6:00, during the opening, the closures ripple red in race order.
    const ripple = choreographer?.active && lastT < STREETS_CLOSE && t >= STREETS_CLOSE && !o.reducedMotion;
    lastT = t;
    if (tween.retarget(closedAt(t), now, true, ripple ? (i) => rippleDelay(i) : undefined)) applyClosures(now);
    applyLight(now);
    map.triggerRepaint();
  };
  // setFeatureState schedules MapLibre's next frame, so the tween steps on
  // MapLibre's own frames only while it is in flight.
  const onRender = () => {
    const now = performance.now();
    if (tweening) applyClosures(now);
    if (measuring && governor) {
      const next = governor.frame(now);
      if (next) setTier(next);
    }
  };

  const ensureRunnerLayer = () => {
    if (!map.getLayer(runners.id)) map.addLayer(runners, RUNNER_BEFORE_LAYER);
  };

  // Context loss: MapLibre rebuilds its style on restore but drops custom layers and
  // feature-state, so both are put back once the rebuilt style has loaded.
  let lostTimer: ReturnType<typeof setTimeout> | undefined;
  map.on("webglcontextlost", () => {
    courseState.setReady(false);
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => o.onFallback("context-lost"), CONTEXT_RESTORE_MS);
  });
  map.on("webglcontextrestored", () => {
    clearTimeout(lostTimer);
    map.once("style.load", () => {
      ensureRunnerLayer();
      courseState.setReady(true); // writes closed, selected and hover for every segment
      applyClosures(performance.now());
      addSpotLayer();
    });
  });

  // Taps pick the course within a few px (its line is thin at the course zoom); whoever
  // listens decides what a tap means (select, clear, drop a pin).
  const tapListeners = new Set<(tap: MapTap) => void>();
  const segmentNear = (x: number, y: number, slop: number): number | null => {
    const hits = map.queryRenderedFeatures(
      [
        [x - slop, y - slop],
        [x + slop, y + slop],
      ],
      { layers: ["course-line"] },
    );
    return hits.length > 0 && typeof hits[0].id === "number" ? hits[0].id : null;
  };
  const onClick = (e: MapMouseEvent) => {
    const tap: MapTap = { segment: segmentNear(e.point.x, e.point.y, TAP_SLOP_PX), lngLat: [e.lngLat.lng, e.lngLat.lat] };
    for (const listener of tapListeners) listener(tap);
  };

  // Hover, on devices with a fine pointer only: highlight the segment and show a pointer
  // cursor. One query per animation frame at most.
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let hovered: number | null = null;
  let hoverPoint: { x: number; y: number } | null = null;
  let hoverFrame = 0;
  let picking = false;
  const setHover = (next: number | null) => {
    if (next === hovered) return;
    if (hovered !== null) courseState.setFlag(hovered, "hover", false);
    if (next !== null) courseState.setFlag(next, "hover", true);
    hovered = next;
    if (!picking) map.getCanvas().style.cursor = next === null ? "" : "pointer";
  };

  // The pinned spot: a DOM marker that lands with a spring (MapLink animates
  // its graphic) and a dashed line to the nearest closure, drawn below the runners.
  let spotData: SpotData = NO_SPOT;
  let pin: Marker | null = null;
  const addSpotLayer = () => {
    if (!map.getSource(SPOT_SOURCE)) map.addSource(SPOT_SOURCE, { type: "geojson", data: spotData });
    if (!map.getLayer(SPOT_LAYER)) {
      map.addLayer(
        { id: SPOT_LAYER, type: "line", source: SPOT_SOURCE, layout: { "line-cap": "round" }, paint: { "line-color": DAY.leaders.you, "line-width": 2.5, "line-dasharray": [1.5, 1.5] } },
        RUNNER_BEFORE_LAYER,
      );
    }
  };
  const pinElement = () => {
    const el = document.createElement("div");
    el.className = "spot-pin";
    el.innerHTML =
      '<svg viewBox="0 0 26 34" aria-hidden="true"><path class="spot-pin-body" d="M13 33s11-10.2 11-19.3A11 11 0 0 0 2 13.7C2 22.8 13 33 13 33z"/><circle class="spot-pin-dot" cx="13" cy="13" r="4.2"/></svg>';
    return el;
  };
  const onMouseMove = (e: MapMouseEvent) => {
    hoverPoint = { x: e.point.x, y: e.point.y };
    if (hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      if (hoverPoint) setHover(segmentNear(hoverPoint.x, hoverPoint.y, HOVER_SLOP_PX));
    });
  };
  const onMouseOut = () => {
    hoverPoint = null;
    setHover(null);
  };

  // A drag, zoom, rotate or pitch by the user cancels the opening choreography.
  const onUserCamera = (e: { originalEvent?: unknown }) => {
    if (e.originalEvent) cancelChoreography();
  };

  const unsubscribeLeaders = leaderSettings.subscribe(() => map.triggerRepaint());

  let unsubscribe = () => {};
  let unsubscribeCancel = () => {};
  let choreographer: Choreographer | null = null;
  map.once("load", () => {
    const now = performance.now();
    tween.retarget(closedAt(o.clock.getSnapshot().t), now, false);
    applyClosures(now);
    courseState.setReady(true);
    ensureRunnerLayer();
    map.on("render", onRender);
    map.on("movestart", onMoveStart);
    map.on("moveend", onMoveEnd);
    map.on("click", onClick);
    addSpotLayer();
    if (canHover) {
      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseOut);
    }
    for (const type of ["dragstart", "zoomstart", "rotatestart", "pitchstart"] as const) map.on(type, onUserCamera);
    applyLight(now, true);
    // The opening runs if the stage asked for it and nothing has cancelled it since.
    const s = o.clock.getSnapshot();
    if (o.cinematic && !choreographyCancelled.get() && !s.live && s.t <= OPENING_TIME + 0.5) {
      choreographer = new Choreographer({ map, clock: o.clock });
      choreographer.start();
    } else {
      o.clock.hold(false);
    }
    // The earned promotion is judged on the first 5 s, when the governor can see frames.
    governor = new FrameGovernor(tier, now);
    updateMeasuring();
    unsubscribe = o.clock.subscribe(onClock);
    unsubscribeCancel = choreographyCancelled.subscribe(() => {
      if (choreographyCancelled.get()) choreographer?.cancel();
    });
    o.onReady();
  });

  const engine: MapEngine = {
    fitCourse(animate) {
      map.fitBounds(COURSE_BOUNDS, { padding: o.padding(), duration: animate && !o.reducedMotion ? FIT_MS : 0 });
    },
    zoomBy(delta) {
      map.easeTo({ zoom: map.getZoom() + delta, duration: o.reducedMotion ? 0 : ZOOM_MS });
    },
    setSegmentFlag(index, flag, on) {
      courseState.setFlag(index, flag, on);
    },
    fitSegment(index) {
      map.fitBounds(segmentBounds(index), { padding: o.padding(), maxZoom: SELECT_MAX_ZOOM, duration: o.reducedMotion ? 0 : SELECT_MS });
    },
    onTap(listener) {
      tapListeners.add(listener);
      return () => {
        tapListeners.delete(listener);
      };
    },
    setSpot(spot) {
      spotData = spot?.nearest
        ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [spot.pin, spot.nearest] } }] }
        : NO_SPOT;
      map.getSource<GeoJSONSource>(SPOT_SOURCE)?.setData(spotData);
      if (!spot) {
        pin?.remove();
        pin = null;
        return null;
      }
      if (pin) pin.setLngLat(spot.pin);
      else pin = new Marker({ element: pinElement(), anchor: "bottom" }).setLngLat(spot.pin).addTo(map);
      return pin.getElement().firstElementChild as HTMLElement | null;
    },
    setPicking(on) {
      picking = on;
      map.getCanvas().style.cursor = on ? "crosshair" : hovered === null ? "" : "pointer";
    },
    centerOn(lngLat) {
      map.easeTo({ center: lngLat, duration: o.reducedMotion ? 0 : FIT_MS });
    },
    destroy() {
      choreographer?.cancel();
      clearTimeout(lightTimer);
      unsubscribeCancel();
      courseState.setReady(false);
      clearTimeout(lostTimer);
      unsubscribe();
      document.removeEventListener("visibilitychange", updateMeasuring);
      window.removeEventListener(LAYOUT_EVENT, checkView);
      cancelAnimationFrame(hoverFrame);
      unsubscribeLeaders();
      tapListeners.clear();
      pin?.remove();
      map.remove();
      labels.destroy();
      if (window.__cmm?.map === map) delete window.__cmm;
    },
  };
  if (navigator.webdriver) window.__cmm = { map, runners, engine };
  return engine;
}
