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
  const targetDate = new Date(date)
  const utcMinutes = targetDate.getUTCHours() * 60 + targetDate.getUTCMinutes()
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', hour12: false })
  const timeString = formatter.format(targetDate)
  const [hours, minutes] = timeString.split(':').map(Number)
  const targetMinutes = hours * 60 + minutes

  let offset = targetMinutes - utcMinutes

  if (offset > 720) {
    offset -= 1440
  } else if (offset < -720) {
    offset += 1440
  }

  return offset
}
