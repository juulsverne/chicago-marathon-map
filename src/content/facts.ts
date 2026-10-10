import type { SourceId } from "./sources";
import type { Tensed } from "./tense";

// The Facts tab: fact tiles, race week, watch and follow, sources.

export type FactTile = Readonly<{ value: string; text: string; sources: readonly SourceId[] }>;

export const FACT_TILES: readonly FactTile[] = [
  { value: "1977", text: "The modern race began in 1977 as the Mayor Daley Marathon: about 4,200 runners took part and 2,128 finished.", sources: ["S20", "S18"] },
  { value: "200,000+", text: "people applied for the 2026 race, a record, for about 55,000 spots.", sources: ["S10", "S6"] },
  { value: "1905", text: "Chicago's first marathon: 20 signed up, 15 started, 7 finished.", sources: ["S18"] },
  { value: "0.2 mi", text: 'to go at "Mount Roosevelt," a 700-foot stretch of Roosevelt Rd that rises 23 feet, the only real climb on a flat course.', sources: ["S22"] },
  { value: "35 km", text: "(21.7 mi): how long Jacob Kiplimo stayed on world-record pace here in 2025.", sources: ["S17"] },
  { value: "88°F", text: "The 2007 race hit record October heat and was partly shut down after about three and a half hours.", sources: ["S21", "S18"] },
  { value: "6.5 hrs", text: "Finish inside that window for an official time, about 15 minutes per mile.", sources: ["S5"] },
  { value: "75%+", text: "of 2025 participants traveled from outside Illinois.", sources: ["S9"] },
  { value: "$405M+", text: "raised through the official charity program since 2002 ($47.1M in 2025 alone).", sources: ["S10"] },
  { value: "$756M", text: "economic impact of the 2025 race (Jones & Associates Economics study).", sources: ["S9"] },
];

export type RaceWeekDay = Readonly<{ day: string; text: Tensed; sources: readonly SourceId[] }>;

export const RACE_WEEK: readonly RaceWeekDay[] = [
  {
    day: "Thu 8",
    text: { future: "Columbus Dr at the finish closes at 6:00 AM until Monday 3:00 PM.", past: "Columbus Dr at the finish closed at 6:00 AM until Monday 3:00 PM." },
    sources: ["S1"],
  },
  {
    day: "Thu 8 to Sat 10",
    text: {
      future: "Abbott Health & Fitness Expo at McCormick Place (North Building, Hall B1), free.",
      past: "Abbott Health & Fitness Expo at McCormick Place (North Building, Hall B1), free.",
    },
    sources: ["S7", "S3"],
  },
  {
    day: "Sat 10",
    text: {
      future: "The Abbott Chicago 5K starts at 7:30 AM in Grant Park and finishes at Wacker Dr & Adams St (downtown closures about 6:30 to 9:30 AM).",
      past: "The Abbott Chicago 5K started at 7:30 AM in Grant Park and finished at Wacker Dr & Adams St (downtown closures about 6:30 to 9:30 AM).",
    },
    sources: ["S3", "S7"],
  },
  {
    day: "Sun 11",
    text: {
      future: "Course streets close at about 6:00 AM, then reopen from 10:30 AM (Grand Ave) to 6:00 PM (Roosevelt Rd).",
      past: "Course streets closed at about 6:00 AM, with reopenings scheduled from 10:30 AM (Grand Ave) to 6:00 PM (Roosevelt Rd).",
    },
    sources: ["S1"],
  },
  { day: "Mon 12", text: { future: "Columbus Dr reopens at 3:00 PM.", past: "Columbus Dr was scheduled to reopen at 3:00 PM." }, sources: ["S1"] },
];

export const WATCH = {
  lines: [
    {
      text: {
        future: "Live 7 to 11 AM CT on NBC 5 Chicago and Telemundo Chicago, streaming nationally on Peacock and Roku; extended stream to 3 PM CT on nbcchicago.com.",
        past: "Race day aired live 7 to 11 AM CT on NBC 5 Chicago and Telemundo Chicago, and streamed nationally on Peacock and Roku.",
      },
      sources: ["S6"],
    },
    {
      text: { future: "Radio: Sports Radio 104.3 The Score (670 AM).", past: "Radio coverage aired on Sports Radio 104.3 The Score (670 AM)." },
      sources: ["S6"],
    },
    {
      text: { future: "Track runners in the Bank of America Chicago Marathon App.", past: "Track runners in the Bank of America Chicago Marathon App." },
      sources: ["S4"],
    },
  ] as readonly { text: Tensed; sources: readonly SourceId[] }[],
  links: [
    { label: "City alerts by text or email:", text: "notifychicago.org", href: "https://www.notifychicago.org/", sources: ["S28", "S1"] },
    { label: "Official race info:", text: "chicagomarathon.com", href: "https://www.chicagomarathon.com/", sources: ["S1"] },
  ] as readonly { label: string; text: string; href: string; sources: readonly SourceId[] }[],
} as const;

export const FACTS_COPY = {
  raceWeekTitle: "Race week",
  raceWeekZone: "Times CT",
  watchTitle: "Watch and follow",
  sourcesTitle: "Sources",
  sourcesCaption: "Every fact on this page comes from one of these. Undated pages show when they were read.",
  source: (publisher: string, date: string) => `${publisher}, ${date}`,
} as const;

export const DATA_CREDITS = {
  text: "Street and river lines: City of Chicago Street Center Lines. Neighborhood outlines: blackmad/neighborhoods.",
  sources: ["S26", "S27"] as readonly SourceId[],
} as const;
