/**
 * Get the time zone offset in minutes from a `timeZone` string and a `date`.
 *
 * @example
 * ```ts
 * getTimezoneOffset('Europe/Berlin', new Date('2021-01-01T00:00:00.000Z'))    // 60
 * getTimezoneOffset('Europe/Berlin', new Date('2021-06-01T00:00:00.000Z'))    // 120
 * getTimezoneOffset('America/New_York', new Date('2021-01-01T00:00:00.000Z')) // -300
 * getTimezoneOffset('Asia/Tokyo', new Date('2021-01-01T00:00:00.000Z'))       // +540
 * ```
 */
export function getTimezoneOffset(timeZone: string, date: number | string | Date = new Date()): number {
  date = new Date(date)
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }))
  const offset = (tzDate.getTime() - utcDate.getTime()) / 60000
  return offset
}
