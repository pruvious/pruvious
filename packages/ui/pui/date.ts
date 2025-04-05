import { isEmpty, isNumber, isString, toSeconds } from '@pruvious/utils'
import dayjs from 'dayjs/esm'
import minMax from 'dayjs/esm/plugin/minMax'
import timezone from 'dayjs/esm/plugin/timezone'
import utc from 'dayjs/esm/plugin/utc'
import type { PUITimezone } from './timezone'

export type PUIDayjs = typeof dayjs

export type PUIDateInput = dayjs.ConfigType

let extended = false

function extend() {
  if (!extended) {
    dayjs.extend(minMax)
    dayjs.extend(timezone)
    dayjs.extend(utc)

    extended = true
  }
}

/**
 * Returns an extended `Dayjs` instance with the following plugins applied:
 *
 * - minMax
 * - timezone
 * - utc
 *
 * @see https://day.js.org
 */
export function puiDate(date?: PUIDateInput, format?: string, strict?: boolean) {
  return puiDayjs()(date, format, strict)
}

/**
 * Returns an extended `Dayjs` instance in UTC mode with the following plugins applied:
 *
 * - minMax
 * - timezone
 * - utc
 *
 * @see https://day.js.org/docs/en/plugin/utc
 */
export function puiDateUTC(date?: PUIDateInput, format?: string, strict?: boolean) {
  return puiDayjs().utc(date, format, strict)
}

/**
 * Returns an extended `PUIDayjs` object with the following plugins applied:
 *
 * - minMax
 * - timezone
 * - utc
 *
 * @see https://day.js.org
 */
export function puiDayjs(): PUIDayjs {
  extend()
  return dayjs
}

/**
 * Parses a `time` string or number into a timestamp.
 * The input value can be:
 *
 * - Numeric - Unix timestamp in milliseconds.
 *   - Values must be rounded to the nearest second.
 *     Millisecond timestamps are only used for consistency.
 * - String - ISO 8601 formatted date.
 *   - Parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
 * - Object - Object with `hours`, `minutes`, and `seconds` properties.
 *
 * @example
 * ```ts
 * puiParseTime(3600000)    // 3600000
 * puiParseTime('01:00:00') // 3600000
 * puiParseTime('01:00')    // 3600000
 * ```
 */
export function puiParseTime(time: number | string | { hours?: number; minutes?: number; seconds?: number }): number {
  if (isNumber(time)) {
    return time
  } else if (isString(time)) {
    return Date.parse('1970-01-01T' + time + 'Z')
  }

  const { hours = 0, minutes = 0, seconds = 0 } = time
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

/**
 * Parses a `date` string or number into a timestamp.
 * The input value can be:
 *
 * - Numeric - Unix timestamp in milliseconds.
 *   - Values must be rounded to the nearest second.
 *     Millisecond timestamps are only used for consistency.
 * - String - ISO 8601 formatted date.
 *   - Parsed through `Date.parse(date)`.
 *
 *   * @example
 * ```ts
 * puiParseDateTime(new Date('2024-12-15').getTime()) // 1734220800000
 * puiParseDateTime('2024-12-15T00:00:00.000Z')       // 1734220800000
 * puiParseDateTime('2024')                           // 1704067200000
 * ```
 */
export function puiParseDateTime(date: number | string): number {
  return isNumber(date) ? date : Date.parse(date)
}

/**
 * Parses a time `span` into a timestamp.
 * The input value can be:
 *
 * - Numeric - Unix timestamp in milliseconds.
 *   - Values must be rounded to the nearest second.
 *     Millisecond timestamps are only used for consistency.
 * - String - Duration string (e.g., '1 hour', '30 minutes').
 *   - Parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
 * - Object - Object with `days`, `hours`, `minutes`, and `seconds` properties.
 *
 * @example
 * ```ts
 * puiParseDateTimeSpan(3600000)      // 3600000
 * puiParseDateTimeSpan('1 hour')     // 3600000
 * puiParseDateTimeSpan('30 minutes') // 1800000
 * puiParseDateTimeSpan({ hours: 1 }) // 3600000
 * ```
 */
export function puiParseTimeSpan(
  span: number | string | { days?: number; hours?: number; minutes?: number; seconds?: number },
): number {
  if (isNumber(span)) {
    return span
  } else if (isString(span)) {
    return toSeconds(span) * 1000
  }

  const { days = 0, hours = 0, minutes = 0, seconds = 0 } = span
  return (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000
}

/**
 * Converts a timestamp into an object containing date and time components.
 * The returned object contains years, months (0-11), days (1-31), hours (0-23), minutes (0-59), and seconds (0-59).
 * All values are in UTC timezone.
 *
 * @example
 * ```ts
 * puiTimestampToSpanObject(1734220800000)
 * // { years: 2024, months: 11, days: 15, hours: 0, minutes: 0, seconds: 0 }
 * ```
 */
export function puiTimestampToSpanObject(timestamp: number): {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
} {
  const date = puiDateUTC(timestamp)
  return {
    years: date.year(),
    months: date.month(),
    days: date.date(),
    hours: date.hour(),
    minutes: date.minute(),
    seconds: date.second(),
  }
}

/**
 * Resolves the `timezone` identifier.
 * It must be a valid IANA time zone name or `local`.
 * If not specified, returns the local timezone.
 */
export function puiResolveTimezone(timezone?: PUITimezone | 'local'): PUITimezone {
  return isEmpty(timezone) || timezone === 'local' ? (puiDayjs().tz.guess() as PUITimezone) : timezone
}
