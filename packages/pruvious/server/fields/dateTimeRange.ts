import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { arrayFieldModel } from '@pruvious/orm'
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
   * The minimum allowed time range (difference between the start and end of the range) in milliseconds.
   * By default, both time values can be the same.
   *
   * Note: The value is rounded to second precision as milliseconds are not used in the calendar.
   *
   * @default 0
   */
  minRange?: number

  /**
   * The maximum allowed time range (difference between the start and end of the range) in milliseconds.
   * By default, no maximum range is set.
   *
   * Note: The value is rounded to second precision as milliseconds are not used in the calendar.
   *
   * @default null
   */
  maxRange?: number | null

  ui?: {
    /**
     * Specifies whether the inputs are clearable.
     *
     * @default true
     */
    clearable?: boolean

    /**
     * The field icon to display in the first calendar input.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-down'
     */
    iconFrom?: keyof typeof icons | null

    /**
     * The field icon to display in the second calendar input.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-up'
     */
    iconTo?: keyof typeof icons | null

    /**
     * Specifies the starting date/time displayed when a calendar opens.
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
     * The placeholder text for the first calendar input.
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * Important: When using a function, only use simple anonymous functions without context binding,
     * since the option needs to be serialized for client-side use.
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * placeholder: 'Departure'
     *
     * // Function (translatable)
     * placeholder: ({ __ }) => __('pruvious-dashboard', 'Departure')
     * ```
     */
    placeholderFrom?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * The placeholder text for the second calendar input.
     *
     * You can either provide a string or a function that returns a string.
     * The function receives an object with `_` and `__` properties to access the translation functions.
     *
     * Important: When using a function, only use simple anonymous functions without context binding,
     * since the option needs to be serialized for client-side use.
     *
     * @example
     * ```ts
     * // String (non-translatable)
     * placeholder: 'Return'
     *
     * // Function (translatable)
     * placeholder: ({ __ }) => __('pruvious-dashboard', 'Return')
     * ```
     */
    placeholderTo?: string | ((context: TranslatableStringCallbackContext) => string) | undefined

    /**
     * Specifies whether to show the seconds input in the time pickers.
     *
     * @default true
     */
    showSeconds?: boolean

    /**
     * The starting day of the week for a calendar month.
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
     * The time zone to use when displaying the date/time in the calendars.
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
     * Specifies whether the calendars should include time selection.
     *
     * When disabled, all timestamps are set to midnight.
     * The `timezone` is used to resolve the midnight time.
     *
     * @default false
     */
    withTime?: boolean
  }
} = {
  min: -8640000000000000,
  max: 8640000000000000,
  minRange: 0,
  maxRange: null,
  ui: {
    clearable: true,
    iconFrom: 'calendar-down',
    iconTo: 'calendar-up',
    initial: null,
    placeholderFrom: undefined,
    placeholderTo: undefined,
    showSeconds: true,
    startDay: 1,
    timezone: 0,
    withTime: false,
  },
}

export default defineField({
  model: arrayFieldModel<'number', 'number', [number, number], [number, number], [number | string, number | string]>([
    'number',
    'null',
  ] as any),
  nullable: true,
  default: null,
  sanitizers: [], // @todo sanitize any date input (e.g., ['2024-12-15', 1702627200000]) <- use `toDate()`
  validators: [], // @todo missing from or to (e.g. [0, null]), [timestampValidator(), timestampValidator()], min/max, minRange/maxRange
  customOptions: { ...customOptions, minItems: 2, maxItems: 2 } as typeof customOptions,
  uiOptions: {},
  omitOptions: [
    'allowEmptyArray',
    'allowValues',
    'deduplicateItems',
    'denyValues',
    'enforceUniqueItems',
    'minItems',
    'maxItems',
  ],
})
