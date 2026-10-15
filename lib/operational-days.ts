/**
 * Helper utilities for School Operational Days configuration and calculations.
 * Supports configurable operational schedules:
 * - "Senin - Jumat" (5 hari kerja/sekolah: Senin, Selasa, Rabu, Kamis, Jumat)
 * - "Senin - Sabtu" (6 hari kerja/sekolah: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)
 */

export type OperationalDaysPattern = "Senin - Jumat" | "Senin - Sabtu";

export const OPERATIONAL_DAYS_OPTIONS: { label: string; value: OperationalDaysPattern; desc: string; daysCount: number }[] = [
  {
    label: "Senin – Jumat (5 Hari Sekolah)",
    value: "Senin - Jumat",
    desc: "Sekolah beroperasi 5 hari kerja (Senin s.d. Jumat). Sabtu dan Minggu adalah hari libur.",
    daysCount: 5,
  },
  {
    label: "Senin – Sabtu (6 Hari Sekolah)",
    value: "Senin - Sabtu",
    desc: "Sekolah beroperasi 6 hari kerja (Senin s.d. Sabtu). Hanya Minggu yang merupakan hari libur.",
    daysCount: 6,
  },
];

const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Checks if a given date is an operational school day based on the configured pattern.
 * @param date YYYY-MM-DD string or Date object
 * @param pattern "Senin - Jumat" | "Senin - Sabtu"
 */
export function isSchoolOperationalDay(
  date: string | Date,
  pattern: OperationalDaysPattern | string = "Senin - Jumat"
): boolean {
  let d: Date;
  if (typeof date === "string") {
    // Append T12:00:00 to prevent local timezone drift when parsing YYYY-MM-DD
    const dateStr = date.split("T")[0];
    d = new Date(`${dateStr}T12:00:00`);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return true;

  const dayOfWeek = d.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

  // Minggu is ALWAYS non-operational
  if (dayOfWeek === 0) return false;

  // If 6-day week (Senin - Sabtu), Monday (1) to Saturday (6) are operational
  if (pattern === "Senin - Sabtu") {
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }

  // Default: 5-day week (Senin - Jumat), Monday (1) to Friday (5) are operational
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Returns the Indonesian day name for a given date.
 */
export function getIndonesianDayName(date: string | Date): string {
  let d: Date;
  if (typeof date === "string") {
    d = new Date(`${date.split("T")[0]}T12:00:00`);
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "";
  return DAY_NAMES_ID[d.getDay()] || "";
}

/**
 * Returns list of operational days in Indonesian.
 */
export function getOperationalDaysList(pattern: OperationalDaysPattern | string = "Senin - Jumat"): string[] {
  if (pattern === "Senin - Sabtu") {
    return ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  }
  return ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
}

/**
 * Returns a human-friendly status string for a date under the operational pattern.
 */
export function getOperationalDayStatus(
  date: string | Date,
  pattern: OperationalDaysPattern | string = "Senin - Jumat"
): { isOperational: boolean; label: string; reason: string } {
  const isOp = isSchoolOperationalDay(date, pattern);
  const dayName = getIndonesianDayName(date);

  if (isOp) {
    return {
      isOperational: true,
      label: "Hari Operasional",
      reason: `${dayName} adalah hari aktif belajar mengajar (${pattern}).`,
    };
  }

  return {
    isOperational: false,
    label: "Hari Libur / Non-Operasional",
    reason: `${dayName} bukan merupakan hari aktif sekolah (${pattern}).`,
  };
}
