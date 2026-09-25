import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns YYYY-MM-DD in local calendar time (e.g., Asia/Jakarta / WIB).
 * Avoids UTC skew bugs where toISOString() yields yesterday's date before 07:00 AM WIB.
 * Automatically rolls over at 00:00 midnight local time.
 */
export function getTodayDateString(dateInput?: Date): string {
  const now = dateInput || new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const getLocalDateString = getTodayDateString;
