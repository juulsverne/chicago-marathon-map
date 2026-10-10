import type { MouseEvent } from "react";
import { isClosed } from "@/model/closures";
import { SEGMENTS } from "@/model/course";

/** The 41 course streets as blocks in race order, red while closed (v1). A pointer
 *  shortcut to the list: `onPick` gets a tapped block's index. Keyboard and screen
 *  reader users have the list itself, so the strip stays out of the accessibility tree. */
export function StreetCellsView({ minute, selected = -1, onPick }: { minute: number; selected?: number; onPick?: (index: number) => void }) {
  const pick = onPick
    ? (e: MouseEvent<HTMLDivElement>) => {
        const i = Number((e.target as HTMLElement).dataset.i);
        if (Number.isInteger(i)) onPick(i);
      }
    : undefined;
  return (
    <div aria-hidden="true" className={`flex h-6 gap-[2px] ${onPick ? "cursor-pointer" : ""}`} data-testid="street-cells" onClick={pick}>
      {SEGMENTS.map((s) => (
        <span
          key={s.slug}
          data-i={s.index}
          data-selected={s.index === selected || undefined}
          className={`flex-1 rounded-[2px] transition-colors duration-(--motion-base) ${isClosed(s, minute) ? "bg-closed" : "bg-open"} ${onPick ? "hover:opacity-80" : ""} data-selected:outline-2 data-selected:outline-offset-1 data-selected:outline-fg`}
        />
      ))}
    </div>
  );
}
