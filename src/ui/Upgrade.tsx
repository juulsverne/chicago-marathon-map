"use client";

import type { ReactNode } from "react";
import { useInteraction } from "./interaction-loader";

type Islands = (typeof import("./interaction"))["ISLANDS"];
export type IslandName = keyof Islands;

/** Shows the prerendered `children` until the interaction layer has loaded, then the
 *  live island of that name, which draws the same box (src/ui/interaction.tsx ISLANDS). */
export function Upgrade({ name, children }: { name: IslandName; children: ReactNode }) {
  const ui = useInteraction();
  if (!ui) return children;
  const Island = ui.ISLANDS[name];
  return <Island />;
}
