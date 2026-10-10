"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CARD_COPY } from "@/content/card";
import { DAY_END, DAY_START } from "@/content/race";
import { DURATION, EASING, SPRING, seconds } from "@/motion/tokens";
import { SEGMENTS } from "@/model/course";
import { useClock } from "../clock-context";
import { notifyLayout } from "../layout-event";
import { statsAt } from "../model-stats";
import { closeOverlay, openOverlay } from "../overlays";
import { sheetSnap } from "../panel/sheet-state";
import { clearSelection, selection, type Selection } from "../selection";
import { ganttSpans } from "../streets/street-view";
import { ShareButton } from "../share/ShareButton";
import { PHONE_QUERY, useMedia } from "../use-media";
import { useStore } from "../use-store";
import { cardEyebrow, cardSentence, detailRows, statusLine } from "./card-view";

const frac = (t: number) => (t - DAY_START) / (DAY_END - DAY_START);
const pct = (f: number) => `${(f * 100).toFixed(2)}%`;

/** The street card: one per selection, in the header column from 768 px and
 *  above the dock on phones. Picked from the list, it grows out of the row (a Motion
 *  shared-element transition on the row's plate); otherwise it rises into place.
 *  Opening it pushes one history entry, so Back closes it. */
export function StreetCard() {
  const sel = useStore(selection);
  const phone = useMedia(PHONE_QUERY);
  // This component only ever renders in the browser (the interaction layer), so it can look up its slot.
  const slot = useMemo(() => document.querySelector<HTMLElement>(`[data-card-slot="${phone ? "phone" : "wide"}"]`), [phone]);

  // History and layout follow the selection, however it changes.
  const open = sel !== null;
  useEffect(() => {
    if (!open) return;
    openOverlay("card", clearSelection);
    return () => closeOverlay("card");
  }, [open]);
  useEffect(() => {
    // On phones a picked street lowers the sheet so the map and the card show (v1).
    if (sel && window.matchMedia(PHONE_QUERY).matches) sheetSnap.set("peek");
    const frame = requestAnimationFrame(() => notifyLayout());
    return () => cancelAnimationFrame(frame);
  }, [sel]);

  if (!slot) return null;
  return createPortal(
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="popLayout">{sel && <Card key={sel.index} sel={sel} compact={phone} />}</AnimatePresence>
    </MotionConfig>,
    slot,
  );
}

function Card({ sel, compact }: { sel: Selection; compact: boolean }) {
  const seg = SEGMENTS[sel.index];
  const minute = useClock((s) => Math.floor(s.t), 10);
  const [details, setDetails] = useState(!compact);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId(); // unique: while one card leaves, the next is already in
  const fromList = sel.via === "list";

  // Picked from the list (often by keyboard): move focus to the card, and back to the row on close.
  useEffect(() => {
    if (!fromList) return;
    const node = heading.current;
    node?.focus({ preventScroll: true });
    const slug = seg.slug;
    return () => {
      if (document.activeElement === document.body || node?.contains(document.activeElement)) {
        document.querySelector<HTMLElement>(`[data-testid="street-row"][data-slug="${slug}"] button`)?.focus({ preventScroll: true });
      }
    };
  }, [fromList, seg.slug]);

  const status = statusLine(seg, minute);
  const sentence = cardSentence(seg, minute, statsAt(minute).active[seg.index]);
  const g = ganttSpans(seg);
  const enter = { duration: seconds(DURATION.slow), ease: EASING.emphasized };
  return (
    <motion.section
      role="region"
      aria-labelledby={titleId}
      data-testid="street-card"
      data-slug={seg.slug}
      onKeyDown={(e) => {
        if (e.key === "Escape") clearSelection();
      }}
      initial={fromList ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: seconds(DURATION.quick), ease: EASING.standard } }}
      transition={enter}
      className="pointer-events-auto relative isolate max-h-[45dvh] overflow-y-auto rounded-panel p-4 md:max-h-none"
    >
      {/* The plate shares the row's layoutId: picked from the list, it grows out of the row. */}
      <motion.div
        aria-hidden="true"
        layoutId={fromList ? `street-${sel.index}` : undefined}
        transition={SPRING.ui}
        className="absolute inset-0 -z-10 rounded-panel bg-panel shadow-lg ring-1 ring-line"
      />
      <motion.div
        initial={fromList ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: seconds(DURATION.base), delay: fromList ? seconds(DURATION.quick) : 0, ease: EASING.standard }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="pt-1 font-mono text-[11px] uppercase tracking-wider text-muted">{cardEyebrow(seg)}</p>
          <button
            type="button"
            aria-label={CARD_COPY.close}
            onClick={() => clearSelection()}
            className="pressable -mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h2 ref={heading} id={titleId} tabIndex={-1} className="font-display text-2xl font-bold uppercase leading-none tracking-wide text-fg outline-none">
          {seg.street}
        </h2>
        <p className="mt-1 text-sm text-muted">{seg.range}</p>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-fg" data-testid="card-status">
          <i aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${status.closed ? "bg-closed" : "bg-open"}`} />
          {status.text}
        </p>
        {sentence && (
          <p className="mt-2 text-sm leading-snug text-muted" data-testid="card-sentence">
            {sentence}
          </p>
        )}
        <ShareButton slug={seg.slug} street={seg.street} />
        <div className="mt-3" role="img" aria-label={CARD_COPY.timelineLabel}>
          <div className="relative h-3 overflow-hidden rounded-full bg-panel-2">
            <span className="absolute inset-y-0 bg-closed/30" style={{ left: pct(g.closed[0]), width: pct(g.closed[1] - g.closed[0]) }} />
            <span className="absolute inset-y-0 bg-closed" style={{ left: pct(g.runners[0]), width: pct(g.runners[1] - g.runners[0]) }} />
            <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg" style={{ left: pct(frac(minute)) }} />
          </div>
          <div aria-hidden="true" className="relative mt-1 h-3 font-mono text-[10px] text-muted">
            {CARD_COPY.axis.map((a) => (
              <span key={a.t} className="absolute -translate-x-1/2" style={{ left: pct(frac(a.t)) }}>
                {a.label}
              </span>
            ))}
          </div>
        </div>
        <details open={details} onToggle={(e) => setDetails(e.currentTarget.open)} className="mt-3 text-sm">
          <summary className="pressable cursor-pointer rounded font-semibold text-fg underline-offset-4 hover:underline">{CARD_COPY.details}</summary>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            {detailRows(seg).map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-muted">{r.label}</dt>
                <dd className="text-right font-mono text-xs leading-5 text-fg">{r.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </motion.div>
    </motion.section>
  );
}
