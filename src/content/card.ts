// The street card. Only the lazily loaded card imports this module. Times are
// the organizer's anticipated reopenings (source S1) and the model's arrival times, so
// both carry "~"; a time that stands alone carries "CT".

export const CARD_COPY = {
  label: "Street details",
  close: "Close street details",
  eyebrow: (area: string, from: string, to: string) => `${area} · miles ${from}–${to}`,
  closedUntil: (time: string, wait: string) => `Closed until ~${time} CT · reopens in ${wait}`,
  openAgain: (time: string) => `Open again since ~${time} CT`,
  openNow: (wait: string) => `Open now · closes at 6:00 AM CT, in ${wait}`,
  finishArea: "Closed Thu Oct 8, 6:00 AM to Mon Oct 12, 3:00 PM CT",
  timelineLabel: "This street's day: closed to cars, then runners passing",
  axis: [
    { t: 360, label: "6a" },
    { t: 600, label: "10a" },
    { t: 840, label: "2p" },
    { t: 1080, label: "6p" },
  ],
  details: "Closure and runner times (CT)",
  closes: "Closes",
  reopens: "Reopens",
  closed: "Closed",
  thursday: "Thu Oct 8, 6:00 AM",
  monday: "Mon Oct 12, 3:00 PM",
  wheelchair: "Wheelchair leaders",
  elite: "Elite runners",
  crowd: "Biggest crowd",
  last: "Last runners",
  approx: (time: string) => `~${time}`,
} as const;
