"use client";

import { Tabs } from "@base-ui/react/tabs";
import { COPY } from "@/content/copy";
import { PANEL_TABS, TAB_CLASS, TAB_LIST_CLASS, TAB_PILL_CLASS, panelId, tabId, type PanelTab } from "./tabs";

/** Base UI's tab bar: arrow keys move between tabs and select them, Home and
 *  End jump to the ends, and the active pill slides to the active tab. The panels are
 *  PanelTabs' own, so each tab points at its panel by id. */
export function TabBar({ value, onChange }: { value: PanelTab; onChange: (tab: PanelTab) => void }) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onChange(next as PanelTab)}>
      <Tabs.List activateOnFocus aria-label={COPY.tabsLabel} className={TAB_LIST_CLASS}>
        {PANEL_TABS.map((t) => (
          <Tabs.Tab key={t} value={t} id={tabId(t)} aria-controls={panelId(t)} className={TAB_CLASS}>
            {COPY.tabs[t]}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator
          className={`absolute inset-y-1 left-[calc(var(--active-tab-left)+0.25rem)] w-[calc(var(--active-tab-width)-0.5rem)] transition-[left,width] duration-(--motion-base) ease-standard motion-reduce:transition-none ${TAB_PILL_CLASS}`}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
