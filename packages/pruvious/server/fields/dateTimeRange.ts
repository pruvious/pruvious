import { defineField, type TranslatableStringCallbackContext } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { arrayFieldModel } from '@pruvious/orm'
import { puiParseTimeSpan } from '@pruvious/ui/composables/puiDate'
import type { PUITimezone } from '@pruvious/ui/composables/puiTimezone'
import { castToNumber, isArray, isInteger, isNotNull, isNull, isString } from '@pruvious/utils'

const customOptions: {
  /**
   * The minimum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to January 1st, 100 CE (0100-01-01T00:00:00.000Z).
   *
   * @default -59011459200000
   *
   * @example
   * ```ts
   * new Date('2024-12-15').getTime()
   * '2024-12-15T00:00:00.000Z'
   * '2024'
   * ```
   */
  min?: number | string

  /**
   * The maximum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted date.
   *   - Parsed through `Date.parse()`.
   *
   * When not specified, defaults to the latest possible date in JavaScript.
   *
   * @default 8640000000000000
   *
   * @example
   * ```ts
   * new Date('2077-06-06').getTime()
   * '2077-06-06T00:00:00.000Z'
   * '2077'
   * ```
   */
  max?: number | string

  /**
   * Minimum time span between start and end dates.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - Duration string (e.g., '1 hour', '30 minutes').
   *   - Parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `days`, `hours`, `minutes`, and `seconds` properties.
   *
   * By default, start and end times can be identical (zero time difference).
   *
   * @default 0
   */
  minRange?: number | string | { days?: number; hours?: number; minutes?: number; seconds?: number }

  /**
   * Maximum time span between start and end dates.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - Duration string (e.g., '1 day', '4 hours').
   *   - Parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `days`, `hours`, `minutes`, and `seconds` properties.
   * - null - No maximum range limit.
   *
   * When specified, prevents selection of date ranges exceeding this duration.
   *
   * @default null
   */
  maxRange?: number | string | { days?: number; hours?: number; minutes?: number; seconds?: number } | null

  ui?: {
    /**
     * Controls the visibility of the clear button in the calendar inputs.
     * When set to `false`, users cannot remove their date selection.
     *
     * @default true
     */
    clearable?: boolean

    /**
     * The position of the decoration line that visually connects the two inputs.
     *
     * @default 'left'
     */
    decorator?: 'left' | 'right' | 'hidden'

    /**
     * The icon to display in the first calendar input.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-down'
     */
    iconFrom?: keyof typeof icons | null

    /**
     * The icon to display in the second calendar input.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-up'
     */
    iconTo?: keyof typeof icons | null

    /**
     * Sets the initial year and month shown when the calendar opens.
     * Accepts these formats:
     *
     * - Numeric - Unix timestamp in milliseconds.
     * - String - ISO 8601 formatted date.
     *
     * If not specified, the calendar will try to use the field's current value.
     * When no value exists, it defaults to the current year and month.
     *
     * @default null
     */
    initial?: number | string | null

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
     * The time zone identifier for displaying date values in the calendar.
     * The value must be a valid IANA time zone name or `local`.
     *
     * This setting affects both calendar display and dates in the data table.
     *
     * @default 'local'
     *
     * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List
     * @see https://www.iana.org/time-zones
     *
     * @example
     * ```ts
     * 'local'
     * 'Europe/Berlin'
     * 'America/New_York'
     * 'Asia/Tokyo'
     * ```
     */
    timezone?: PUITimezone | 'local'
  }
} = {
  min: -59011459200000,
  max: 8640000000000000,
  minRange: 0,
  maxRange: null,
  ui: {
    clearable: true,
    decorator: 'left',
    iconFrom: 'calendar-down',
    iconTo: 'calendar-up',
    initial: null,
    placeholderFrom: undefined,
    placeholderTo: undefined,
    showSeconds: true,
    startDay: 1,
    timezone: 'local',
  },
}

export default defineField({
  model: arrayFieldModel<'number', 'number', [number, number], [number, number], [number | string, number | string]>([
    'number',
    'null',
  ] as any),
  nullable: true,
  default: null,
  sanitizers: [
    (value) => {
      if (isArray(value)) {
        try {
          return value.map(castToNumber).map((v) => (isString(v) ? Date.parse(v) : v)) as [number, number]
        } catch {}
      }
      return value
    },
  ],
  validators: [
    (value, { context }) => {
      if (isNotNull(value)) {
        for (const v of value) {
          if (!isInteger(v)) {
            throw new Error(context.__('pruvious-api', 'The values must be integers'))
          }
        }
      }
    },
    (value, { definition, context }) => {
      if (isNotNull(value)) {
        const min = isString(definition.options.min) ? Date.parse(definition.options.min) : definition.options.min
        const max = isString(definition.options.max) ? Date.parse(definition.options.max) : definition.options.max

        for (const v of value) {
          if (v < min) {
            throw new Error(context.__('pruvious-api', 'The values must be greater than or equal to `$min`', { min }))
          }

          if (v > max) {
            throw new Error(context.__('pruvious-api', 'The values must be less than or equal to `$max`', { max }))
          }
        }
      }
    },
    (value, { definition, context }) => {
      if (isNotNull(value)) {
        const minRange = puiParseTimeSpan(definition.options.minRange)
        const maxRange = isNull(definition.options.maxRange) ? null : puiParseTimeSpan(definition.options.maxRange)

        if (value[1] - value[0] < minRange) {
          throw new Error(
            context.__(
              'pruvious-api',
              'The difference between the values must be greater than or equal to `$minRange`',
              { minRange },
            ),
          )
        }

        if (isNotNull(maxRange) && value[1] - value[0] > maxRange) {
          throw new Error(
            context.__('pruvious-api', 'The difference between the values must be less than or equal to `$maxRange`', {
              maxRange,
            }),
          )
        }
      }
    },
    (value, { context }) => {
      if (isNotNull(value)) {
        for (const v of value) {
          const date = new Date(v)
          if (date.getUTCMilliseconds() !== 0) {
            throw new Error(context.__('pruvious-api', 'The values must be rounded to seconds'))
          }
        }
      }
    },
  ],
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
