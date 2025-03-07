import { getUser } from '#pruvious/client'
import _dayjs from 'dayjs/esm'
import advancedFormat from 'dayjs/esm/plugin/advancedFormat'
import isoWeek from 'dayjs/esm/plugin/isoWeek'
import localizedFormat from 'dayjs/esm/plugin/localizedFormat'
import timezone from 'dayjs/esm/plugin/timezone'
import utc from 'dayjs/esm/plugin/utc'
import weekOfYear from 'dayjs/esm/plugin/weekOfYear'
import 'dayjs/locale/de'

// @ts-ignore
import de from 'dayjs/locale/de'

const locales = { de }

let extended = false

function extend() {
  if (!extended) {
    _dayjs.extend(advancedFormat)
    _dayjs.extend(isoWeek)
    _dayjs.extend(localizedFormat)
    _dayjs.extend(timezone)
    _dayjs.extend(utc)
    _dayjs.extend(weekOfYear)
    extended = true
  }
}

/**
 * Returns an extended dayjs instance with all plugins loaded.
 *
 * @see https://day.js.org
 */
export function dayjs(date?: _dayjs.ConfigType, format?: string, strict?: boolean): _dayjs.Dayjs {
  return getDayjs(false, date, format, strict)
}

/**
 * Returns an extended dayjs instance in UTC mode with all plugins loaded.
 *
 * @see https://day.js.org/docs/en/plugin/utc
 */
export function dayjsUTC(config?: _dayjs.ConfigType, format?: string, strict?: boolean): _dayjs.Dayjs {
  return getDayjs(true, config, format, strict)
}

function getDayjs(utc: boolean, date?: _dayjs.ConfigType, format?: string, strict?: boolean) {
  extend()
  const language = (getUser()?.dashboardLanguage ?? 'en') as keyof typeof locales
  return utc
    ? _dayjs.utc(date, format, strict).locale(locales[language] ?? 'en')
    : _dayjs(date, format, strict).locale(locales[language] ?? 'en')
}
