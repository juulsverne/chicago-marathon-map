import { Store } from "../store";

/** The panel's four tabs, in order. */
export const PANEL_TABS = ["streets", "race", "records", "facts"] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

export const tabId = (tab: PanelTab) => `tab-${tab}`;
export const panelId = (tab: PanelTab) => `panel-${tab}`;

/** A request for the panel to show a tab from its top: a pin dropped from the map shows
 *  the spot card, which leads the Streets tab (v1). `n` lets a request repeat. */
export const tabRequest = new Store<Readonly<{ tab: PanelTab; n: number }> | null>(null);

let requests = 0;

export function requestTab(tab: PanelTab): void {
  requests += 1;
  tabRequest.set({ tab, n: requests });
}

/** Shared by the prerendered tab bar and Base UI's, so swapping one for the other moves nothing.
 *  v1's segmented control: the tabs fill a tray and the active one has a dark pill drawn 4 px
 *  inside it (the prerendered bar draws it in the tab, Base UI's indicator slides it). The
 *  tray is no taller than the 44 px tabs, so a 320 x 568 phone's half sheet keeps its room. */
export const TAB_CLASS =
  "pressable relative z-[1] flex h-11 flex-1 items-center justify-center rounded-xl font-display text-sm font-bold uppercase tracking-wider text-muted hover:bg-line/50 hover:text-fg aria-selected:text-fg";

/** The tray the tabs sit in, for both tab bars. */
export const TAB_LIST_CLASS = "relative flex rounded-xl bg-panel-2";

/** The active tab's pill: inside the tab on the prerendered bar, Base UI's sliding indicator. */
export const TAB_PILL_CLASS = "rounded-lg bg-bg shadow-md ring-1 ring-line";
