import { defineField } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { numberFieldModel, timestampValidator } from '@pruvious/orm'
import type { TimezoneName } from '../../utils/pruvious/timezone'

const customOptions: {
  /**
   * The minimum date that can be selected.
   * Value must be specified in milliseconds since Unix epoch.
   * The default value represents the earliest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default -8640000000000000
   *
   * @example
   * ```ts
   * new Date('2024-12-15').getTime()
   * ```
   */
  min?: number

  /**
   * The maximum date that can be selected.
   * Value must be specified in milliseconds since Unix epoch.
   * The default value represents the latest possible date in JavaScript.
   *
   * Note: Round the value to second precision as milliseconds are not used in the calendar.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * new Date('2077-06-06').getTime()
   * ```
   */
  max?: number

  /**
   * The time zone to use when displaying the date/time in the calendar.
   * The stored value is always in UTC.
   *
   * This value represents the time difference in minutes between UTC and local time.
   * You can also use a time zone name (e.g., 'Europe/Berlin') which will automatically handle daylight saving time adjustments.
   *
   * By default, the time zone offset is set to UTC (GMT+0).
   *
   * @default 0
   *
   * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
   * @see https://www.iana.org/time-zones
   *
   * @example
   * ```ts
   * // GMT+1
   * 60
   *
   * // GMT-5
   * -300
   *
   * // Time zone name
   * 'Europe/Berlin'
   * ```
   */
  timezone?: number | TimezoneName

  ui?: {
    /**
     * Specifies whether the input is clearable.
     *
     * @default true
     */
    clearable?: boolean

    /**
     * The field icon.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-week'
     */
    icon?: keyof typeof icons | null

    /**
     * Specifies the starting date/time displayed when the calendar opens.
     * It must be a timestamp in milliseconds since Unix epoch or `null`.
     *
     * - When not specified, the selected value is used.
     * - If the selected value is not set, the current date will be used.
     *
     * Note: Round the value to second precision as milliseconds are not used in the calendar.
     *
     * @default null
     */
    initial?: number | null

    /**
     * Controls whether values should be shown as relative time expressions (like '2 hours ago' or 'in 3 days')
     * instead of absolute dates throughout the user interface.
     *
     * @default false
     */
    relativeTime?: boolean

    /**
     * Specifies whether to show the seconds input in the time picker.
     *
     * @default true
     */
    showSeconds?: boolean

    /**
     * The starting day of the week for the calendar month.
     *
     * - `0` - Sunday
     * - `1` - Monday
     * - `2` - Tuesday
     * - `3` - Wednesday
     * - `4` - Thursday
     * - `5` - Friday
     * - `6` - Saturday
     *
     * @default 1
     */
    startDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  }

  /**
   * Specifies whether the calendar should include time selection.
   *
   * When disabled, all timestamps are set to midnight.
   * The `timezone` is used to resolve the midnight time.
   *
   * @default false
   */
  withTime?: boolean
} = {
  min: -8640000000000000,
  max: 8640000000000000,
  timezone: 0,
  ui: {
    clearable: true,
    icon: 'calendar-week',
    initial: null,
    relativeTime: false,
    showSeconds: true,
    startDay: 1,
  },
  withTime: false,
}

export default defineField({
  model: numberFieldModel(),
  nullable: true,
  default: null,
  sanitizers: [], // @todo sanitize any date input
  validators: [timestampValidator()],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
