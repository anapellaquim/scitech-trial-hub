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

export const APP_TIMEZONE = "America/Sao_Paulo";

/**
 * Parse a date-only string ("YYYY-MM-DD" or "YYYY-MM-DDT...") as a LOCAL date,
 * preserving the calendar day exactly as stored. Avoids the UTC shift bug.
 *
 * Accepts a Date instance and returns it as-is.
 * Returns an Invalid Date for null/empty input.
 */
export function parseLocalDate(value: string | number | Date | null | undefined, ...rest: number[]): Date {
  // Multi-arg form (year, monthIndex, day, ...) — pass through to native Date
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
 * Serialize a Date (or "YYYY-MM-DD" string) to "YYYY-MM-DD" using LOCAL
 * components — never UTC. Use this whenever you persist a date-only field.
 */
export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? parseLocalDate(value) : value;
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * Today's date as "YYYY-MM-DD" in local time. Safe default for date inputs.
 */
export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}
