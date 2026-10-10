// Every factual claim in src/content carries ids from this list.
// The Facts tab lists them. `date` is the publication date
// where one is given; undated live pages say when they were read.

export type Source = Readonly<{ id: string; title: string; publisher: string; url: string; date: string }>;

export const SOURCES = [
  { id: "S1", title: "Street Closures — Sunday, October 11, 2026 (street closure brochure)", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/08/31160104/26-BACM-STREET-CLOSURE-BROCHURE.pdf", date: "2026-08-31" },
  { id: "S2", title: "Street Closures", publisher: "Bank of America Chicago Marathon", url: "https://www.chicagomarathon.com/streetclosures/", date: "accessed 2026-10-09" },
  { id: "S3", title: "The City of Chicago and Race Organizers Prepare for the Bank of America Chicago Marathon set for Sunday, October 11", publisher: "City of Chicago, Office of Emergency Management and Communications", url: "https://www.chicago.gov/city/en/depts/oem/provdrs/emerg_mang/news/2026/October/BankofAmericaMarathon2026.html", date: "2026-10-06" },
  { id: "S4", title: "Spectator Information (schedule of events)", publisher: "Bank of America Chicago Marathon", url: "https://www.chicagomarathon.com/event-info/spectator-info/", date: "accessed 2026-10-09" },
  { id: "S5", title: "Course (course map, course time limit)", publisher: "Bank of America Chicago Marathon", url: "https://www.chicagomarathon.com/event-info/participant-information/course/", date: "accessed 2026-10-09" },
  { id: "S6", title: "2026 Top Stories and Broadcast Information", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/09/22085346/092226_2026-BACM_Press-Release_Event-Updates.pdf", date: "2026-09-22" },
  { id: "S7", title: "2026 Bank of America Chicago Marathon Race Week Media Information", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/10/05110626/Bank-of-America-Chicago-Marathon-Race-Week-Media-Alert.pdf", date: "2026-10-05" },
  { id: "S8", title: "Defending Champions Ready to Take On Stacked Field at 48th Bank of America Chicago Marathon", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/07/24120151/2026_BACM_Professional-Athlete-Field-Announcement_072326_APPROVED.pdf", date: "2026-07-23" },
  { id: "S9", title: "2025 Bank of America Chicago Marathon Pumps Record $756 Million into Chicago Economy", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/08/24120150/03.12.26-2025-Economic-Impact-Bank-of-America-Chicago-Marathon.pdf", date: "2026-03-12" },
  { id: "S10", title: "Bank of America Chicago Marathon Shatters Another Record: $47.1 Million for Charity", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2025/12/24120403/121125_WAGNER_2026_BACM_Press-Release_Drawing-Selection-Charity-FINAL.pdf", date: "2025-12-11" },
  { id: "S11", title: "World-Class Performances Cement Chicago as the City of Records", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2025/12/24120403/101225_2025-BACM_Press-Release_Post-Race_FINAL.pdf", date: "2025-10-12" },
  { id: "S12", title: "Ratified: world records for Sawe, Ehammer, Charlton and more", publisher: "World Athletics", url: "https://worldathletics.org/news/press-releases/ratified-world-records-sawe-ehammer-charlton-mcrae-yan-duplantis-assefa", date: "2026-07-23" },
  { id: "S13", title: "Sawe breaks two-hour barrier with 1:59:30 world record at London Marathon", publisher: "World Athletics", url: "https://worldathletics.org/competitions/world-athletics-label-road-races/news/sawe-two-hour-assefa-world-record-london-marathon", date: "2026-04-26" },
  { id: "S14", title: "Ratified: Kiptum's world marathon record", publisher: "World Athletics", url: "https://worldathletics.org/news/press-releases/ratified-world-marathon-record-kelvin-kiptum", date: "2024-02-06" },
  { id: "S15", title: "Ratified: world records for Chebet, Duplantis, McLaughlin-Levrone, Chepngetich and Kawano", publisher: "World Athletics", url: "https://worldathletics.org/news/press-releases/ratified-world-records-chebet-duplantis-mclaughlin-levrone-chepngetich-kawano", date: "2024-12-11" },
  { id: "S16", title: "Chepngetich retains women's marathon world record despite three-year ban", publisher: "Al Jazeera (news agencies)", url: "https://www.aljazeera.com/sports/2025/10/23/chepngetich-retains-womens-marathon-world-record-despite-three-year-ban", date: "2025-10-23" },
  { id: "S17", title: "Feysa and Kiplimo claim Chicago Marathon crowns", publisher: "World Athletics", url: "https://worldathletics.org/competitions/world-athletics-label-road-races/news/feysa-kiplimo-chicago-marathon-2025", date: "2025-10-12" },
  { id: "S18", title: "Chicago Marathon (history, records, finisher table)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Chicago_Marathon", date: "accessed 2026-10-09" },
  { id: "S19", title: "Marathon world record progression", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Marathon_world_record_progression", date: "accessed 2026-10-09" },
  { id: "S20", title: "The Mayor Daley Marathon", publisher: "NBC Chicago", url: "https://www.nbcchicago.com/news/local/the-mayor-daley-marathon/1940817/", date: "2012-10-02" },
  { id: "S21", title: "Chicago Marathon: A History Lesson In Weather", publisher: "NBC Chicago", url: "https://www.nbcchicago.com/news/local/chicago-marathon-weather-history/1963352/", date: "2013-09-25" },
  { id: "S22", title: "2026 Chicago Marathon — what to know, how to watch", publisher: "Chicago Sun-Times", url: "https://chicago.suntimes.com/sports/2026/10/06/2026-chicago-marathon-what-to-know-how-to-watch", date: "2026-10-06" },
  { id: "S23", title: "53,000 runners hit the pavement for 2025 Bank of America Chicago Marathon", publisher: "CBS Chicago", url: "https://www.cbsnews.com/chicago/news/53000-runners-2025-bank-of-america-chicago-marathon/", date: "2025-10-12" },
  { id: "S24", title: "A Mile-by-Mile Breakdown of the Chicago Marathon Course", publisher: "Marathon Handbook", url: "https://marathonhandbook.com/chicago-marathon-course-mile-by-mile/", date: "2026-10-07 (last updated)" },
  { id: "S25", title: "Roads and expressways in Chicago (address grid: 800 numbers per mile)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Roads_and_expressways_in_Chicago", date: "accessed 2026-10-09" },
  { id: "S26", title: "Street Center Lines", publisher: "City of Chicago Data Portal", url: "https://data.cityofchicago.org/d/6imu-meau", date: "accessed 2026-10-09" },
  { id: "S27", title: "blackmad/neighborhoods", publisher: "GitHub (blackmad)", url: "https://github.com/blackmad/neighborhoods", date: "accessed 2026-10-09" },
  { id: "S28", title: "NotifyChicago", publisher: "City of Chicago", url: "https://www.notifychicago.org/", date: "accessed 2026-10-09" },
  { id: "S29", title: "Course Flyer — Chicago Marathon Notice (English)", publisher: "Bank of America Chicago Marathon", url: "https://cdn.chicagomarathon.com/app/uploads/2026/08/31160103/26-BACM-COURSE-FLYER-ENGLISH.pdf", date: "2026-08-31" },
  { id: "S30", title: "All-time top lists: Marathon, women, senior", publisher: "World Athletics", url: "https://worldathletics.org/records/all-time-toplists/road-running/marathon/all/women/senior", date: "accessed 2026-10-09" },
  { id: "S31", title: "Event-Record 160,000 People Apply for the 2025 Bank of America Chicago Marathon", publisher: "Bank of America Newsroom", url: "https://newsroom.bankofamerica.com/content/newsroom/press-releases/2024/12/event-record-160-000-people-apply-for-the-2025-bank-of-america-c.html", date: "2024-12-12" },
] as const satisfies readonly Source[];

export type SourceId = (typeof SOURCES)[number]["id"];

/** A claim and the sources that back it. */
export type Sourced = Readonly<{ sources: readonly SourceId[] }>;

export function sourceById(id: SourceId): Source {
  const found = SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown source ${id}`);
  return found;
}
