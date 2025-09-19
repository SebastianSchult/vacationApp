// src/lib/holidays.ts
// Bundesweite Feiertage für DE + Osterberechnung (Gauss/Anonymous Gregorian)
export type Bundesland =
  | "DE"
  | "BW"
  | "BY"
  | "BE"
  | "BB"
  | "HB"
  | "HH"
  | "HE"
  | "MV"
  | "NI"
  | "NW"
  | "RP"
  | "SL"
  | "SN"
  | "ST"
  | "SH"
  | "TH";

// Hilfsfunktionen
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Ostersonntag nach anonymer gregorianischer Methode
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3= März, 4= April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Bundesweite Feiertage als ISO-Date-Strings (YYYY-MM-DD).
 * Optional: später per `bundesland` erweitern (derzeit ignoriert, default "DE").
 */
export function getHolidaySet(year: number, state: Bundesland = "DE"): Set<string> {
  void state; // reserved for future state-specific holidays
  const set = new Set<string>();

  // Fixe Feiertage
  set.add(`${year}-01-01`); // Neujahr
  set.add(`${year}-05-01`); // Tag der Arbeit
  set.add(`${year}-10-03`); // Tag der Deutschen Einheit
  set.add(`${year}-12-25`); // 1. Weihnachtstag
  set.add(`${year}-12-26`); // 2. Weihnachtstag

  // Bewegliche um Ostern
  const easter = easterSunday(year);
  const goodFriday = addDays(easter, -2);
  const easterMonday = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const whitMonday = addDays(easter, 50);

  [goodFriday, easterMonday, ascension, whitMonday].forEach((d) => {
    set.add(toISODate(d));
  });

  return set;
}
