import type { Tensed as TensedText } from "@/content/tense";

/** Copy in the right tense for the date. Both forms are in the prerendered
 *  page; main[data-tense="past"] (set after hydration, from Oct 12 CT) shows the past one. */
export function Tensed({ text }: { text: TensedText }) {
  if (text.future === text.past) return <>{text.future}</>;
  return (
    <>
      <span className="tense-future">{text.future}</span>
      <span className="tense-past">{text.past}</span>
    </>
  );
}
