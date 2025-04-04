import { defineField } from '#pruvious/server'
import { numberFieldModel } from '@pruvious/orm'
import { isNotNull, isString } from '@pruvious/utils'

const customOptions: {
  /**
   * The minimum selectable time.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds (e.g., `3600000` for 01:00:00).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time.
   *   - Parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *
   * When not specified, defaults to 0 milliseconds (00:00:00).
   *
   * @default 0
   *
   * @example
   * ```ts
   * 3600000
   * '01:00:00'
   * '01:00'
   * ```
   */
  min?: number | string

  /**
   * The maximum selectable time.
   * Accepts these formats:
   *
   * - Numeric - Unix timestamp in milliseconds (e.g., `7200000` for 02:00:00).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time.
   *   - Parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *
   * When not specified, defaults to 86399000 milliseconds (23:59:59).
   *
   * @default 86399000
   *
   * @example
   * ```ts
   * 7200000
   * '02:00:00'
   * '02:00'
   * ```
   */
  max?: number | string

  ui?: {
    /**
     * Specifies whether to show the seconds input in the time picker.
     *
     * @default true
     */
    showSeconds?: boolean
  }
} = {
  min: 0,
  max: 86399000,
  ui: {
    showSeconds: true,
  },
}

export default defineField({
  model: numberFieldModel(),
  sanitizers: [
    (value) => {
      if (isString(value)) {
        try {
          return Date.parse(`1970-01-01T${value}Z`)
        } catch {}
      }
      return value
    },
  ],
  validators: [
    (value, { definition, context }) => {
      if (isNotNull(value)) {
        if (isString(definition.options.min)) {
          if (value < Date.parse(`197-01-01T${definition.options.min}Z`)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be greater than or equal to `$min`', {
                min: Date.parse(`1970-01-01T${definition.options.min}Z`),
              }),
            )
          }
        }

        if (isString(definition.options.max)) {
          if (value > Date.parse(`1970-01-01T${definition.options.max}Z`)) {
            throw new Error(
              context.__('pruvious-orm', 'The value must be less than or equal to `$max`', {
                max: Date.parse(`1970-01-01T${definition.options.max}Z`),
              }),
            )
          }
        }
      }
    },
    (value, { context }) => {
      if (isNotNull(value)) {
        const date = new Date(value)
        if (date.getUTCMilliseconds() !== 0) {
          throw new Error(context.__('pruvious-api', 'The value must be rounded to seconds'))
        }
      }
    },
  ],
  customOptions,
  omitOptions: ['decimalPlaces', 'min', 'max'],
})
