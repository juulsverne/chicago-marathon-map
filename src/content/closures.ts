// The 41 course closures from the Bank of America Chicago Marathon's street-closure
// notice (Aug 31, 2026; source S1, the same table as S2). Times are the organizer's
// anticipated reopenings. reopensAt: minutes after midnight CT; null = the finish
// area, closed from Thursday 6:00 AM until Monday 3:00 PM.

export type Closure = Readonly<{ street: string; range: string; reopensAt: number | null }>;

export const CLOSURES: readonly Closure[] = [
  { street: "Columbus Dr", range: "Start to Grand Ave", reopensAt: 630 },
  { street: "Grand Ave", range: "Columbus Dr to Dearborn St", reopensAt: 630 },
  { street: "Dearborn St", range: "Grand Ave to Jackson Blvd", reopensAt: 660 },
  { street: "Jackson Blvd", range: "Dearborn St to LaSalle St", reopensAt: 660 },
  { street: "LaSalle St", range: "Jackson Blvd to Stockton Dr", reopensAt: 690 },
  { street: "Stockton Dr", range: "LaSalle Dr to Fullerton Dr", reopensAt: 720 },
  { street: "Fullerton Dr", range: "Stockton Dr to Cannon Dr", reopensAt: 720 },
  { street: "Cannon Dr", range: "Fullerton Dr to Sheridan Rd", reopensAt: 720 },
  { street: "Sheridan Rd", range: "Diversey Pkwy to Belmont Ave", reopensAt: 720 },
  { street: "Inner Lake Shore Dr", range: "Belmont Ave to Sheridan Rd", reopensAt: 720 },
  { street: "Sheridan Rd", range: "Inner Lake Shore Dr to Broadway", reopensAt: 750 },
  { street: "Broadway", range: "Sheridan Rd to Briar Pl", reopensAt: 750 },
  { street: "Broadway", range: "Briar Pl to Diversey Pkwy", reopensAt: 765 },
  { street: "Clark St", range: "Diversey Pkwy to Fullerton Pkwy", reopensAt: 765 },
  { street: "Clark St", range: "Fullerton Pkwy to Webster Ave", reopensAt: 780 },
  { street: "Webster Ave", range: "Clark St to Sedgwick St", reopensAt: 780 },
  { street: "Sedgwick St", range: "Webster Ave to North Ave", reopensAt: 795 },
  { street: "North Ave", range: "Sedgwick St to Wells St", reopensAt: 810 },
  { street: "Wells St", range: "North Ave to Walton St", reopensAt: 810 },
  { street: "Wells St", range: "Walton St to Wacker Dr", reopensAt: 810 },
  { street: "Wacker Dr", range: "Wells St to Adams St", reopensAt: 825 },
  { street: "Adams St", range: "Wacker Dr to Damen Ave", reopensAt: 840 },
  { street: "Damen Ave", range: "Adams St to Jackson Blvd", reopensAt: 840 },
  { street: "Jackson Blvd", range: "Damen Ave to Halsted St", reopensAt: 870 },
  { street: "Halsted St", range: "Jackson Blvd to Taylor St", reopensAt: 870 },
  { street: "Taylor St", range: "Halsted St to Loomis St", reopensAt: 885 },
  { street: "Loomis St", range: "Taylor St to 18th St", reopensAt: 900 },
  { street: "18th St", range: "Loomis St to Halsted St", reopensAt: 915 },
  { street: "Halsted St", range: "18th St to 21st St", reopensAt: 915 },
  { street: "21st St", range: "Halsted St to Canalport Ave", reopensAt: 915 },
  { street: "Canalport Ave", range: "21st St to Cermak Rd", reopensAt: 930 },
  { street: "Cermak Rd", range: "Canalport Ave to Wentworth Ave", reopensAt: 930 },
  { street: "Wentworth Ave", range: "Cermak Rd to 26th St", reopensAt: 945 },
  { street: "26th St", range: "Wentworth Ave to Michigan Ave", reopensAt: 945 },
  { street: "Michigan Ave", range: "26th St to 35th St", reopensAt: 960 },
  { street: "35th St", range: "Michigan Ave to Indiana Ave", reopensAt: 960 },
  { street: "Indiana Ave", range: "35th St to 31st St", reopensAt: 975 },
  { street: "31st St", range: "Indiana Ave to Michigan Ave", reopensAt: 975 },
  { street: "Michigan Ave", range: "31st St to Roosevelt Rd", reopensAt: 990 },
  { street: "Roosevelt Rd", range: "Michigan Ave to Columbus Dr", reopensAt: 1080 },
  { street: "Columbus Dr", range: "Roosevelt Rd to the finish", reopensAt: null },
];

export type Area = Readonly<{ name: string; first: number; last: number }>;

export const AREAS: readonly Area[] = [
  { name: "Grant Park & the Loop", first: 0, last: 4 },
  { name: "Lincoln Park & Lakeview", first: 5, last: 16 },
  { name: "Old Town & River North", first: 17, last: 20 },
  { name: "West Loop & Little Italy", first: 21, last: 26 },
  { name: "Pilsen & Chinatown", first: 27, last: 33 },
  { name: "Bronzeville & the finish", first: 34, last: 40 },
];

export function closureSlug(c: Closure): string {
  return `${c.street} ${c.range}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function areaOf(index: number): number {
  return AREAS.findIndex((a) => index >= a.first && index <= a.last);
}
