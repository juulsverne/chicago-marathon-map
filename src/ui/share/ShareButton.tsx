"use client";

import { useEffect, useState } from "react";
import { SHARE_COPY } from "@/content/share";
import { BASE_PATH } from "@/lib/base-path";
import { shareHref } from "@/model/share-link";
import { formatClock } from "@/model/time";
import { useRaceClock } from "../clock-context";

type Shared = Readonly<{ kind: "idle" | "copied" | "failed"; href: string }>;
const IDLE: Shared = { kind: "idle", href: "" };
const COPIED_MS = 2400;

/** Share: a link to this moment and this street, through the system share
 *  sheet where the browser has one, copied otherwise. */
export function ShareButton({ slug, street }: { slug: string; street: string }) {
  const clock = useRaceClock();
  const [shared, setShared] = useState<Shared>(IDLE);
  useEffect(() => {
    if (shared.kind !== "copied") return;
    const id = setTimeout(() => setShared(IDLE), COPIED_MS);
    return () => clearTimeout(id);
  }, [shared]);

  const share = async () => {
    const t = clock.getSnapshot().t;
    const href = shareHref(`${window.location.origin}${BASE_PATH}`, t, slug);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_COPY.title(street, formatClock(Math.floor(t))), url: href });
        return;
      } catch (error) {
        // Closing the sheet is a choice, not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(href);
      setShared({ kind: "copied", href });
    } catch {
      setShared({ kind: "failed", href });
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={share}
          className="pressable inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-fg ring-1 ring-line hover:bg-panel-2"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current stroke-2">
            <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {SHARE_COPY.button}
        </button>
        <p role="status" className="text-sm text-muted" data-testid="share-status">
          {shared.kind === "copied" ? SHARE_COPY.copied : ""}
        </p>
      </div>
      {shared.kind === "failed" && (
        <p className="mt-2 text-sm text-fg">
          {SHARE_COPY.failed} <span className="select-all break-all font-mono text-xs">{shared.href}</span>
        </p>
      )}
    </div>
  );
}
