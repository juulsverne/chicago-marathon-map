// Sunrise and sunset from NOAA's solar calculator equations (the spreadsheet's
// formulas: https://gml.noaa.gov/grad/solcalc/calcdetails.html), at the standard
// 90.833° zenith (refraction and the sun's radius). Minutes after local midnight.

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function sunTimes(o: { year: number; month: number; day: number; lat: number; lng: number; utcOffsetHours: number }): {
  sunrise: number;
  sunset: number;
} {
  // Julian day at local noon, then Julian century.
  const a = Math.floor((14 - o.month) / 12);
  const y = o.year + 4800 - a;
  const m = o.month + 12 * a - 3;
  const jdn = o.day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const jd = jdn - 0.5 + (12 - o.utcOffsetHours) / 24;
  const T = (jd - 2451545) / 36525;

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360; // mean longitude
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T); // mean anomaly
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T); // eccentricity
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega)); // apparent longitude
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega)); // corrected obliquity
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const yy = Math.tan(rad(eps / 2)) ** 2;
  const eqTime =
    4 *
    deg(
      yy * Math.sin(2 * rad(L0)) -
        2 * e * Math.sin(rad(M)) +
        4 * e * yy * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
        0.5 * yy * yy * Math.sin(4 * rad(L0)) -
        1.25 * e * e * Math.sin(2 * rad(M)),
    ); // minutes

  const ha = deg(Math.acos(Math.cos(rad(90.833)) / (Math.cos(rad(o.lat)) * Math.cos(rad(decl))) - Math.tan(rad(o.lat)) * Math.tan(rad(decl))));
  const noon = 720 - 4 * o.lng - eqTime + o.utcOffsetHours * 60; // local solar noon, minutes
  return { sunrise: noon - ha * 4, sunset: noon + ha * 4 };
}
