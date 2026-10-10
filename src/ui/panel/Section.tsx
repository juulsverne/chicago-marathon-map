import type { ReactNode } from "react";

/** A panel section's heading and optional caption, in one style across the tabs. */
export function SectionHead({ id, title, caption }: { id: string; title: string; caption?: ReactNode }) {
  return (
    <>
      <h3 id={id} className="font-display text-lg font-bold uppercase tracking-wide text-fg">
        {title}
      </h3>
      {caption && <p className="mt-1 text-sm text-muted">{caption}</p>}
    </>
  );
}
