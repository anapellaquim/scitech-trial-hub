/**
 * Date utilities for the CTMS app.
 *
 * Application timezone: America/Sao_Paulo (UTC-03:00, same offset as Goiânia).
 *
 * Why these helpers exist:
 * Date-only fields stored as "YYYY-MM-DD" are parsed by `new Date(str)` as
 * UTC midnight, which then renders as the previous day in any negative-offset
 * timezone (e.g. Brazil). All date-only values MUST go through `parseLocalDate`
 * for display, and through `formatDateOnly` when serializing back to the DB.
 */

import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = "America/Sao_Paulo";

/**
 * Format any timestamp/date/string in the Brasília timezone (America/Sao_Paulo).
 * Returns "" for invalid/empty input. Use this for ALL display formatting.
 */
export function formatInBrasilia(
  value: Date | string | number | null | undefined,
  pattern: string = "dd/MM/yyyy",
): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    // For date-only "YYYY-MM-DD", format the calendar day verbatim without
    // any timezone conversion (avoids shifting the day on browsers in TZ
    // other than America/Sao_Paulo).
    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        // Anchor at noon UTC so DST / offset rounding cannot move the day
        const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
        return formatInTimeZone(d, "UTC", pattern);
      }
    }
    return formatInTimeZone(value as Date | string | number, APP_TIMEZONE, pattern);
  } catch {
    return "";
  }
}

/**
 * "Now" as a Date whose UTC components match the current wall time in Brasília.
 * Use for derived calendar logic (today, day comparisons) instead of `new Date()`.
 */
export function nowInBrasilia(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Parse a date-only string ("YYYY-MM-DD" or "YYYY-MM-DDT...") as a LOCAL date,
 * preserving the calendar day exactly as stored. Avoids the UTC shift bug.
 *
 * Accepts a Date instance and returns it as-is.
 * Returns an Invalid Date for null/empty input.
 */
export function parseLocalDate(value: string | number | Date | null | undefined, ...rest: number[]): Date {
  if (rest.length > 0 && typeof value === "number") {
    return new Date(value as number, ...(rest as [number, ...number[]]));
  }
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return new Date(NaN);
  if (typeof value === "number") return new Date(value);
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(str);
}

/**
 * Serialize a Date (or "YYYY-MM-DD" string) to "YYYY-MM-DD" using Brasília
 * wall-clock components. Use this whenever you persist a date-only field.
 */
export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return formatInTimeZone(d, APP_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Today's date as "YYYY-MM-DD" in Brasília. Safe default for date inputs.
 */
export function todayDateOnly(): string {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

/** Alias for clarity at call sites that want the timezone in the name. */
export const todayDateOnlyBrasilia = todayDateOnly;

/**
 * Manual parser for "YYYY-MM-DD" strings as LOCAL Brazil calendar dates.
 * NEVER passes the string to `new Date(str)` which would interpret as UTC
 * and shift the day in negative-offset timezones.
 *
 * Accepts:
 *  - "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss..." → builds local Date from parts
 *  - Date instance → returned as-is
 *  - null/undefined/"" → Invalid Date
 *
 * Use this EVERYWHERE you need a Date from a date-only string field.
 */
export function parseBrazilDate(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return new Date(NaN);
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(str);
}

