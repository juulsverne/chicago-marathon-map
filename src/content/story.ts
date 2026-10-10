import { CLOSURES } from "./closures";
import { formatClock } from "@/model/time";

// "How it was built": the flyer-to-map story. Imported only by the story,
// which loads on demand, so none of this is in the first-load bundle. Wording follows
// v1's "How this was made" block, corrected: the notice is the marathon's,
// 55,000 runners are modeled, and the evening is the prototype's, told as history.

export const STORY = {
  eyebrow: "How it was built",
  title: "From an elevator flyer to a live map",
  intro:
    "It started with the marathon's street-closure notice taped up in an elevator: 41 rows of street names and times. Accurate, and impossible to picture.",
  noticeTitle: "Street closures",
  noticeSubtitle: "Bank of America Chicago Marathon · Sunday, October 11, 2026",
  noticeColumns: { street: "Street", range: "From, to", reopens: "Reopens" },
  liftCaption: "Every row is a street. Scroll, and each one finds its place on the course.",
  principlesTitle: "Four rules it was built on",
  principles: [
    {
      title: "Start from the real question",
      text: "Nobody wants 41 rows. People want to know when their street reopens and when runners pass their block. So the map leads with a pin you drop and a plain sentence for every street.",
    },
    {
      title: "Use the city's data",
      text: "Every closure is traced on the City of Chicago's street centerlines, 26.2 miles street by street, with times from the marathon's street-closure notice.",
    },
    {
      title: "Model what isn't published",
      text: "The notice has no runner timing, so 55,000 runners are modeled from the wave schedule and typical finish times. Anything estimated is marked with a ~.",
    },
    {
      title: "Phone first",
      text: "Most people will open this from a link. The map stays on screen, the panel slides out of the way, and one color rule holds everywhere: red is closed, blue is open.",
    },
  ],
  history: "Prototyped in an evening as a single web page, then rebuilt as a proper app.",
  builtWith: "Built in conversation with Claude: research, data work, design and code.",
  close: "Every city posts notices like this one. Most of them could be a map.",
  lab: { text: "More experiments in the ElijahOS Lab", href: "https://lab.elijahos.com/" },
  closeButton: "Close",
  mapLabel: "The 41 closures drawn on the marathon course",
} as const;

export type NoticeRow = Readonly<{ street: string; range: string; reopens: string }>;

/** The notice's rows: street, range and the anticipated reopening (the finish area
 *  reopens Monday afternoon). */
export function noticeRows(): NoticeRow[] {
  return CLOSURES.map((c) => ({
    street: c.street,
    range: c.range,
    reopens: c.reopensAt === null ? "Mon 3:00 PM" : formatClock(c.reopensAt),
  }));
}
