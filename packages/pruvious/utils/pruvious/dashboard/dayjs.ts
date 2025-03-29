import _dayjs from 'dayjs/esm'
import advancedFormat from 'dayjs/esm/plugin/advancedFormat'
import isoWeek from 'dayjs/esm/plugin/isoWeek'
import localizedFormat from 'dayjs/esm/plugin/localizedFormat'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import timezone from 'dayjs/esm/plugin/timezone'
import utc from 'dayjs/esm/plugin/utc'
import weekOfYear from 'dayjs/esm/plugin/weekOfYear'
import { getUser } from '../../../modules/pruvious/auth/utils.client'

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
    _dayjs.extend(timezone)
    _dayjs.extend(utc)
    _dayjs.extend(weekOfYear)

    _dayjs.locale(dayjsLocales.de(), null as any, true)

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

/**
 * Formats a `date` input according to the authenticated user's date and time preferences.
 * Uses `LL LTS` format if no user is authenticated.
 */
export function dayjsFormatDateTime(date?: _dayjs.ConfigType): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(`${user.dateFormat} ${user.timeFormat}`) : _date.format('LL LTS')
}

/**
 * Formats a `date` input according to the authenticated user's date preferences.
 * Uses `LL` format if no user is authenticated.
 */
export function dayjsFormatDate(date?: _dayjs.ConfigType): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(user.dateFormat) : _date.format('LL')
}

/**
 * Returns a relative time string (e.g., '2 hours ago', 'in 3 days') for the given `date`.
 * The output is localized according to the authenticated user's dashboard language.
 */
export function dayjsRelative(date?: _dayjs.ConfigType): string {
  return dayjs(date).fromNow()
}

/**
 * Formats a `date` input according to the authenticated user's time preferences.
 * Uses `LTS` format if no user is authenticated.
 */
export function dayjsFormatTime(date?: _dayjs.ConfigType): string {
  const user = getUser()
  const _date = dayjs(date)
  return user ? _date.format(user.timeFormat) : _date.format('LTS')
}

function getDayjs(utc: boolean, date?: _dayjs.ConfigType, format?: string, strict?: boolean) {
  extend()
  const language = getUser()?.dashboardLanguage ?? 'en'
  return utc ? _dayjs.utc(date, format, strict).locale(language) : _dayjs(date, format, strict).locale(language)
}
