import { defineField } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { numberFieldModel, timestampValidator } from '@pruvious/orm'
import { TimezoneName } from '../../utils/pruvious/timezone'

export interface TimestampFieldOptions {
  /**
   * The minimum allowed timestamp value in milliseconds.
   * The default value represents the earliest possible date in JavaScript.
   *
   * @default -8640000000000000
   *
   * @example
   * ```ts
   * 1734220800000 // 2024-12-15
   * ```
   */
  min?: number

  /**
   * The maximum allowed timestamp value in milliseconds.
   * The default value represents the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * 3390163200000 // 2077-06-06
   * ```
   */
  max?: number

  ui?: {
    /**
     * Options for the calendar component.
     * This is only available when the `picker` option is set to `calendar` or `combo`.
     */
    calendar?: {
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

      /**
       * Specifies whether the calendar should include time selection.
       *
       * When disabled, all timestamps are set to midnight.
       * The `timezone` is used to resolve the midnight time.
       *
       * @default false
       */
      withTime?: boolean
    }

    /**
     * Specifies the component used to input the timestamp.
     *
     * - `calendar` - A calendar component for selecting dates (second precision).
     * - `combo` - A toggleable component that allows both calendar and numeric input.
     * - `numeric` - A numeric input field for entering the timestamp directly (in milliseconds).
     *
     * @default 'combo'
     */
    picker?: 'calendar' | 'combo' | 'numeric'

    /**
     * Controls whether timestamps should be shown as relative time expressions (like '2 hours ago' or 'in 3 days')
     * instead of absolute dates throughout the user interface.
     *
     * @default false
     */
    relativeTime?: boolean
  }
}

const customOptions: TimestampFieldOptions = {
  min: -8640000000000000,
  max: 8640000000000000,
  ui: {
    calendar: {
      icon: 'calendar-week',
      initial: null,
      showSeconds: true,
      startDay: 1,
      timezone: 0,
      withTime: false,
    },
    picker: 'combo',
    relativeTime: false,
  },
}

export default defineField({
  model: numberFieldModel(),
  sanitizers: [], // @todo sanitize any date input
  validators: [timestampValidator()],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
