"use client";

import { useEffect, useRef } from "react";
import { STORY, noticeRows } from "@/content/story";
import { storyMap } from "./story-map";
import { closeStory } from "./story-state";

const ROWS = noticeRows();
const MAP = storyMap();

/** "How it was built": the flyer-to-map story. Full screen on phones, a panel
 *  on desktops. Scroll lifts the notice's rows onto the course map (GSAP, loaded here on
 *  demand); with reduced motion it is a static, readable page of the same content. */
export default function Story() {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const scroll = scroller.current;
    if (!el || !scroll) return;
    el.querySelector<HTMLElement>("[data-story-close]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStory();
      if (e.key !== "Tab") return;
      // A modal dialog: Tab cycles through the story's own controls.
      const items = Array.from(el.querySelectorAll<HTMLElement>("button, a[href]"));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.dataset.motion = reduced ? "static" : "scroll";
    let undo = () => {};
    let cancelled = false;
    if (!reduced) {
      import("./story-motion").then(({ animateStory }) => {
        if (!cancelled) undo = animateStory(el, scroll);
      });
    }
    return () => {
      cancelled = true;
      undo();
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-title"
      data-testid="story"
      className="fixed inset-0 z-50 flex flex-col bg-bg text-fg md:left-auto md:w-[min(36rem,100vw)] md:border-l md:border-line md:shadow-2xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{STORY.eyebrow}</p>
        <button
          type="button"
          data-story-close
          onClick={closeStory}
          className="pressable min-h-11 rounded-full px-5 text-sm font-semibold text-fg ring-1 ring-line hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-open"
        >
          {STORY.closeButton}
        </button>
      </div>

      <div ref={scroller} data-story-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="px-5 pb-6 pt-8">
          <h2 id="story-title" className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-wide">
            {STORY.title}
          </h2>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted">{STORY.intro}</p>
        </header>

        {/* The stage: scrolling through it lifts each row onto the course, in race order. */}
        <section aria-label={STORY.noticeTitle} data-story-stage className="relative story-stage">
          <div className="sticky top-0 grid h-[calc(100dvh-4.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 px-5 py-4">
            <div data-testid="story-notice" className="rounded-md bg-paper px-3 py-2.5 text-ink shadow-lg">
              <p className="font-display text-xl font-extrabold uppercase leading-none tracking-wide">{STORY.noticeTitle}</p>
              <p className="mt-0.5 text-[10px] font-semibold">{STORY.noticeSubtitle}</p>
              <ol className="mt-2 columns-2 gap-4 text-[10px] leading-[1.3]">
                {ROWS.map((r, i) => (
                  <li key={`${r.street}-${r.range}`} data-testid="story-row" data-index={i} className="flex break-inside-avoid justify-between gap-1">
                    <span className="truncate">{r.street}</span>
                    <span className="shrink-0 font-mono tabular-nums">{r.reopens}</span>
                  </li>
                ))}
              </ol>
            </div>
            <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="img" aria-label={STORY.mapLabel} className="h-full min-h-0 w-full" data-testid="story-map">
              {MAP.paths.map((d, i) => (
                <path key={`base-${i}`} d={d} className="story-seg-base" />
              ))}
              {MAP.paths.map((d, i) => (
                <path key={`seg-${i}`} d={d} className="story-seg" data-index={i} />
              ))}
            </svg>
            <p className="text-center text-xs text-muted">{STORY.liftCaption}</p>
          </div>
        </section>

        <section aria-labelledby="story-principles" className="px-5 py-12">
          <h3 id="story-principles" className="font-display text-2xl font-bold uppercase tracking-wide">
            {STORY.principlesTitle}
          </h3>
          <ol className="mt-6 space-y-7">
            {STORY.principles.map((p, i) => (
              <li key={p.title} data-testid="story-principle" data-story-reveal className="grid grid-cols-[2rem_1fr] gap-3">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-closed font-display text-base font-bold text-bg">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-xl font-bold uppercase leading-tight tracking-wide">{p.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="px-5 pb-16">
          <div data-story-reveal className="space-y-2 border-t border-line pt-8 text-sm leading-relaxed text-muted">
            <p>{STORY.history}</p>
            <p>{STORY.builtWith}</p>
          </div>
          <p data-testid="story-close-line" className="mt-10 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-fg">
            {STORY.close}
          </p>
          <a
            href={STORY.lab.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm font-semibold text-open underline underline-offset-2 hover:text-fg"
          >
            {STORY.lab.text}
          </a>
        </section>
      </div>
    </div>
  );
}
