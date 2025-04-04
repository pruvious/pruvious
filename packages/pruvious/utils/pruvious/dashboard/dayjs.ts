import type { LanguageCode } from '#pruvious/server'
import { isEmpty } from '@pruvious/utils'
import advancedFormat from 'dayjs/esm/plugin/advancedFormat'
import isoWeek from 'dayjs/esm/plugin/isoWeek'
import localizedFormat from 'dayjs/esm/plugin/localizedFormat'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import weekOfYear from 'dayjs/esm/plugin/weekOfYear'
import { getUser } from '../../../modules/pruvious/auth/utils.client'

const _dayjs = puiDayjs()

export const dayjsLocales = {
  /**
   * @see https://github.com/iamkun/dayjs/blob/dev/src/locale/de.js
   */
  de: (): ILocale => {
    const texts = {
      s: 'ein paar Sekunden',
      m: ['eine Minute', 'einer Minute'],
      mm: '%d Minuten',
      h: ['eine Stunde', 'einer Stunde'],
      hh: '%d Stunden',
      d: ['ein Tag', 'einem Tag'],
      dd: ['%d Tage', '%d Tagen'],
      M: ['ein Monat', 'einem Monat'],
      MM: ['%d Monate', '%d Monaten'],
      y: ['ein Jahr', 'einem Jahr'],
      yy: ['%d Jahre', '%d Jahren'],
    }

    function relativeTimeFormatter(number: number, withoutSuffix: boolean, key: string): string {
      let l = (texts as any)[key]
      if (Array.isArray(l)) {
        l = l[withoutSuffix ? 0 : 1]
      }
      return l.replace('%d', number)
    }

    return {
      name: 'de',
      weekdays: 'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split('_'),
      weekdaysShort: 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
      weekdaysMin: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
      months: 'Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split('_'),
      monthsShort: 'Jan._Feb._März_Apr._Mai_Juni_Juli_Aug._Sept._Okt._Nov._Dez.'.split('_'),
      ordinal: (n) => `${n}.`,
      weekStart: 1,
      // @ts-expect-error
      yearStart: 4,
      formats: {
        LTS: 'HH:mm:ss',
        LT: 'HH:mm',
        L: 'DD.MM.YYYY',
        LL: 'D. MMMM YYYY',
        LLL: 'D. MMMM YYYY HH:mm',
        LLLL: 'dddd, D. MMMM YYYY HH:mm',
      },
      relativeTime: {
        future: 'in %s',
        past: 'vor %s',
        s: relativeTimeFormatter,
        m: relativeTimeFormatter,
        mm: relativeTimeFormatter,
        h: relativeTimeFormatter,
        hh: relativeTimeFormatter,
        d: relativeTimeFormatter,
        dd: relativeTimeFormatter,
        M: relativeTimeFormatter,
        MM: relativeTimeFormatter,
        y: relativeTimeFormatter,
        yy: relativeTimeFormatter,
      } as any,
    }
  },
}

let extended = false

function extend() {
  if (!extended) {
    _dayjs.extend(advancedFormat)
    _dayjs.extend(isoWeek)
    _dayjs.extend(localizedFormat)
    _dayjs.extend(relativeTime)
    _dayjs.extend(weekOfYear)

    _dayjs.locale(dayjsLocales.de(), null as any, true)

    extended = true
  }
}

/**
 * Returns an extended and localized `Dayjs` instance with the following plugins applied:
 *
 * - advancedFormat
 * - isoWeek
 * - localizedFormat
 * - minMax
 * - relativeTime
 * - timezone
 * - utc
 * - weekOfYear
 *
 * The locale and timezone are set according to the authenticated user's settings.
 *
 * @see https://day.js.org
 */
export function dayjs(date?: PUIDateInput, format?: string, strict?: boolean) {
  return getDayjs(false, date, format, strict)
}

/**
 * Returns an extended and localized `Dayjs` instance in UTC mode with the following plugins applied:
 *
 * - advancedFormat
 * - isoWeek
 * - localizedFormat
 * - minMax
 * - relativeTime
 * - timezone
 * - utc
 * - weekOfYear
 *
 * The locale is set according to the authenticated user's settings.
 *
 * @see https://day.js.org/docs/en/plugin/utc
 */
export function dayjsUTC(date?: PUIDateInput, format?: string, strict?: boolean) {
  return getDayjs(true, date, format, strict)
}

function getDayjs(utc: boolean, date?: PUIDateInput, format?: string, strict?: boolean) {
  extend()
  const language = getUser()?.dashboardLanguage ?? 'en'
  const timezone = dayjsResolveTimezone(getUser()?.timezone)
  return utc
    ? _dayjs.utc(date, format, strict).locale(language)
    : _dayjs(date, format, strict).tz(timezone).locale(language)
}

/**
 * Returns an object with the following properties:
 *
 * - `dayjs` - The extended `dayjs` object.
 * - `language` - The authenticated user's `dashboardLanguage`. If not authenticated, defaults to 'en'.
 * - `timezone` - The authenticated user's `timezone`. If not authenticated, defaults to the local timezone.
 *
 * @see https://day.js.org
 */
export function dayjsConfig(): {
  /**
   * The extended `dayjs` object.
   */
  dayjs: typeof _dayjs

  /**
   * The authenticated user's `dashboardLanguage`.
   * If not authenticated, defaults to 'en'.
   */
  language: LanguageCode

  /**
   * The authenticated user's `timezone`.
   * If not authenticated, defaults to the local timezone.
   */
  timezone: PUITimezone

  /**
   * The authenticated user's `dateFormat`.
   * If not authenticated, defaults to `LL` (localized long date format, e.g. 'February 24, 2025').
   */
  dateFormat: string

  /**
   * The authenticated user's `timeFormat`.
   * If not authenticated, defaults to `LTS` (localized time with seconds, e.g. '8:30:25 PM').
   */
  timeFormat: string
} {
  extend()
  const user = getUser()
  const language = user?.dashboardLanguage ?? 'en'
  const timezone = dayjsResolveTimezone(user?.timezone)
  const dateFormat = user?.dateFormat ?? 'LL'
  const timeFormat = user?.timeFormat ?? 'LTS'
  return { dayjs: _dayjs, language, timezone, dateFormat, timeFormat }
}

/**
 * Formats a `date` input according to the authenticated user's date and time preferences.
 * Uses `LL LTS` format in `local` timezone if no user is authenticated.
 */
export function dayjsFormatDateTime(date?: PUIDateInput): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(`${user.dateFormat} ${user.timeFormat}`) : _date.format('LL LTS')
}

/**
 * Formats a `date` input according to the authenticated user's date preferences.
 * Uses `LL` format in `local` timezone if no user is authenticated.
 */
export function dayjsFormatDate(date?: PUIDateInput): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(user.dateFormat) : _date.format('LL')
}

/**
 * Formats a `date` input according to the authenticated user's time preferences.
 * Uses `LTS` format in `local` timezone if no user is authenticated.
 */
export function dayjsFormatTime(date?: PUIDateInput): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(user.timeFormat) : _date.format('LTS')
}

/**
 * Returns a relative time string (e.g., '2 hours ago', 'in 3 days') for the given `date`.
 * The output is localized according to the authenticated user's `dashboardLanguage` and `timezone` settings.
 */
export function dayjsRelative(date?: PUIDateInput): string {
  return dayjs(date).fromNow()
}

/**
 * Resolves the `timezone` identifier.
 * It must be a valid IANA time zone name or `local`.
 * If not specified or set to `local`, returns the user's preferred timezone
 */
export function dayjsResolveTimezone(timezone?: PUITimezone | 'local'): PUITimezone {
  if (isEmpty(timezone) || timezone === 'local') {
    return puiResolveTimezone(getUser()?.timezone)
  }
  return timezone
}
