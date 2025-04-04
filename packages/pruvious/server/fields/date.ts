import { defineField } from '#pruvious/server'
import type { icons } from '@iconify-json/tabler/icons.json'
import { numberFieldModel } from '@pruvious/orm'
import { isNotNull, isString } from '@pruvious/utils'

const customOptions: {
  /**
   * The minimum selectable date.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds.
   *   - Values must be rounded to the nearest UTC day.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted UTC date.
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
   *   - Values must be rounded to the nearest UTC day.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted UTC date.
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

  ui?: {
    /**
     * Controls the visibility of the clear button in the calendar input.
     * When set to `false`, users cannot remove their date selection.
     *
     * @default true
     */
    clearable?: boolean

    /**
     * The icon to display in the calendar input.
     * You can use either a string for Tabler icons or a Vue node for Nuxt icons.
     *
     * @default 'calendar-week'
     */
    icon?: keyof typeof icons | null

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
} = {
  min: -59011459200000,
  max: 8640000000000000,
  ui: {
    clearable: true,
    icon: 'calendar-week',
    initial: null,
    startDay: 1,
  },
}

export default defineField({
  model: numberFieldModel(),
  nullable: true,
  default: null,
  sanitizers: [
    (value) => {
      if (isString(value)) {
        try {
          return Date.parse(value)
        } catch {}
      }
      return value
    },
  ],
  validators: [
    (value, { definition, context }) => {
      if (isNotNull(value)) {
        if (isString(definition.options.min)) {
          if (value < Date.parse(definition.options.min)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be greater than or equal to `$min`', {
                min: Date.parse(definition.options.min),
              }),
            )
          }
        }

        if (isString(definition.options.max)) {
          if (value > Date.parse(definition.options.max)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be less than or equal to `$max`', {
                max: Date.parse(definition.options.max),
              }),
            )
          }
        }
      }
    },
    (value, { context }) => {
      if (isNotNull(value)) {
        const date = new Date(value)
        if (
          date.getUTCHours() !== 0 ||
          date.getUTCMinutes() !== 0 ||
          date.getUTCSeconds() !== 0 ||
          date.getUTCMilliseconds() !== 0
        ) {
          throw new Error(context.__('pruvious-api', 'The value must be rounded to the nearest UTC day'))
        }
      }
    },
  ],
  customOptions,
  uiOptions: { placeholder: true },
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
