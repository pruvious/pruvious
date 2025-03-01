import { isUndefined } from '../common/is'
import { isNumber } from '../number/is'
import { isDate } from './is'

/**
 * Converts a `value` to a `Date` object.
 * If no `value` is provided, the current date-time is used.
 *
 * @example
 * ```ts
 * toDate(new Date('2021-01-01T00:00:00.000Z')) // new Date('2021-01-01T00:00:00.000Z')
 * toDate('2021-01-01T00:00:00.000Z')           // new Date('2021-01-01T00:00:00.000Z')
 * toDate(1609459200000)                        // new Date('2021-01-01T00:00:00.000Z')
 * ```
 */
export function toDate(value?: number | string | Date): Date {
  return isUndefined(value) ? new Date() : isDate(value) ? value : new Date(value)
}

/**
 * Converts a `value` to a SQL date-time string.
 * If no `value` is provided, the current date-time is used.
 *
 * @example
 * ```ts
 * toSQLDateTime(new Date('2021-01-01T00:00:00.000Z')) // '2021-01-01 00:00:00'
 * toSQLDateTime('2021-01-01T00:00:00.000Z')           // '2021-01-01 00:00:00'
 * toSQLDateTime(1609459200000)                        // '2021-01-01 00:00:00'
 * ```
 */
export function toSQLDateTime(value?: Date | string | number): string {
  const date = toDate(value)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Converts a `duration` string to seconds.
 *
 * This utility function is adapted from the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
 *
 * @example
 * ```ts
 * secs('1 minute')          // 60
 * secs('2 hours')           // 7200
 * secs('3 days')            // 259200
 * secs('1 minute ago')      // -60
 * secs('1 minute from now') // 60
 * secs('1.5 minutes')       // 90
 * ```
 */
export function toSeconds(duration: string | number): number {
  if (isNumber(duration)) {
    return Math.round(duration)
  }

  const minute = 60
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const year = day * 365.25
  const regex =
    /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i
  const matched = regex.exec(duration)

  if (!matched || (matched[4] && matched[1])) {
    throw new TypeError('Invalid time period format')
  }

  const value = parseFloat(matched[2]!)
  const unit = matched[3]!.toLowerCase()

  let numericDate: number

  switch (unit) {
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
    case 's':
      numericDate = Math.round(value)
      break
    case 'minute':
    case 'minutes':
    case 'min':
    case 'mins':
    case 'm':
      numericDate = Math.round(value * minute)
      break
    case 'hour':
    case 'hours':
    case 'hr':
    case 'hrs':
    case 'h':
      numericDate = Math.round(value * hour)
      break
    case 'day':
    case 'days':
    case 'd':
      numericDate = Math.round(value * day)
      break
    case 'week':
    case 'weeks':
    case 'w':
      numericDate = Math.round(value * week)
      break
    // years matched
    default:
      numericDate = Math.round(value * year)
      break
  }

  if (matched[1] === '-' || matched[4] === 'ago') {
    return -numericDate
  }

  return numericDate
}
