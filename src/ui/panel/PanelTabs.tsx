"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { COPY } from "@/content/copy";
import { cancelChoreography } from "../choreography";
import { useInteraction } from "../interaction-loader";
import { sheetSnap } from "./sheet-state";
import { PANEL_TABS, TAB_CLASS, TAB_LIST_CLASS, TAB_PILL_CLASS, panelId, tabId, tabRequest, type PanelTab } from "./tabs";

/** The panel's tab bar and its four tab panels. The panels are server-rendered and never
 *  remount; the prerendered bar switches them at once, and Base UI's (keyboard arrows, a
 *  moving indicator) takes over when the interaction layer loads. A tab change cancels
 *  the opening camera choreography and starts the new tab at its top. */
export function PanelTabs({ panels, footer }: { panels: Record<PanelTab, ReactNode>; footer: ReactNode }) {
  const [tab, setTab] = useState<PanelTab>("streets");
  const scroller = useRef<HTMLDivElement>(null);
  const ui = useInteraction();
  const choose = (next: PanelTab) => {
    cancelChoreography();
    // On phones a tab press opens a peeking sheet (v1).
    if (sheetSnap.get() === "peek") sheetSnap.set("half");
    if (next === tab) return;
    setTab(next);
    scroller.current?.scrollTo({ top: 0 });
  };
  // Another part of the UI asks for a tab (src/ui/panel/tabs.ts): show it from its top.
  useEffect(
    () =>
      tabRequest.subscribe(() => {
        const request = tabRequest.get();
        if (!request) return;
        setTab(request.tab);
        scroller.current?.scrollTo({ top: 0 });
      }),
    [],
  );
  return (
    <>
      <div className="shrink-0 px-4 max-md:touch-none md:border-b md:border-line md:pb-3">
        {ui ? (
          <ui.TabBar value={tab} onChange={choose} />
        ) : (
          <div>
            <div role="tablist" aria-label={COPY.tabsLabel} className={TAB_LIST_CLASS}>
              {PANEL_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={tabId(t)}
                  aria-controls={panelId(t)}
                  aria-selected={t === tab}
                  tabIndex={t === tab ? 0 : -1}
                  onClick={() => choose(t)}
                  className={TAB_CLASS}
                >
                  {t === tab && <span aria-hidden="true" className={`absolute inset-1 -z-[1] ${TAB_PILL_CLASS}`} />}
                  {COPY.tabs[t]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div ref={scroller} data-panel-scroll className="sheet-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
        {PANEL_TABS.map((t) => (
          <div key={t} role="tabpanel" id={panelId(t)} aria-labelledby={tabId(t)} hidden={t !== tab} tabIndex={0} className="outline-offset-[-2px]">
            {panels[t]}
          </div>
        ))}
        {footer}
      </div>
    </>
  );
}
