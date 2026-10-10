/** Copy that changes with the date: future tense before and on race day,
 *  past tense from Oct 12. The prerendered page shows the future form; the client
 *  switches after hydration. */
export type Tense = "future" | "past";
export type Tensed = Readonly<{ future: string; past: string }>;
