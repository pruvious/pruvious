import { defineField } from '#pruvious/server'
import { arrayFieldModel } from '@pruvious/orm'
import { puiParseTimeSpan } from '@pruvious/ui/pui/date'
import { castToNumber, isArray, isInteger, isNotNull, isString } from '@pruvious/utils'

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

  /**
   * Minimum time span between start and end times.
   * Accepts these formats:
   *
   * - Numeric - Timestamp in milliseconds (e.g., `3600000` for 1 hour).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time or duration string (e.g., '1 hour', '30 minutes').
   *   - ISO 8601 format is parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *   - Duration string is parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `hours`, `minutes`, and `seconds` properties.
   *
   * By default, start and end times can be identical (zero time difference).
   *
   * @default 0
   */
  minRange?: number | string | { hours?: number; minutes?: number; seconds?: number }

  /**
   * Maximum time span between start and end times.
   * Accepts these formats:
   *
   * - Numeric - Timestamp in milliseconds (e.g., `7200000` for 2 hours).
   *   - Values must be rounded to the nearest second.
   *     Millisecond timestamps are only used for consistency.
   * - String - ISO 8601 formatted time or duration string (e.g., '1 hour', '30 minutes').
   *   - ISO 8601 format is parsed through `Date.parse('1970-01-01T' + time + 'Z')`.
   *   - Duration string is parsed using the [`jose`](https://github.com/panva/jose/blob/main/src/lib/secs.ts) library.
   * - Object - Object with `hours`, `minutes`, and `seconds` properties.
   *
   * By default, the maximum range is 86399000 milliseconds (23:59:59).
   *
   * @default 86399000
   */
  maxRange?: number | string | { hours?: number; minutes?: number; seconds?: number }

  ui?: {
    /**
     * The position of the decoration line that visually connects the two inputs.
     *
     * @default 'left'
     */
    decorator?: 'left' | 'right' | 'hidden'

    /**
     * Specifies whether to show the seconds inputs.
     *
     * @default true
     */
    showSeconds?: boolean
  }
} = {
  min: 0,
  max: 86399000,
  minRange: 0,
  maxRange: 86399000,
  ui: {
    decorator: 'left',
    showSeconds: true,
  },
}

export default defineField({
  model: arrayFieldModel<'number', 'number', [number, number], [number, number], [number | string, number | string]>([
    'number',
    'null',
  ] as any),
  default: [0, 86399000],
  sanitizers: [
    (value) => {
      if (isArray(value)) {
        try {
          return value.map(castToNumber).map((v) => (isString(v) ? Date.parse(`1970-01-01T${v}Z`) : v)) as [
            number,
            number,
          ]
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
        const min = isString(definition.options.min)
          ? Date.parse(`1970-01-01T${definition.options.min}Z`)
          : definition.options.min
        const max = isString(definition.options.max)
          ? Date.parse(`1970-01-01T${definition.options.max}Z`)
          : definition.options.max

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
        const maxRange = puiParseTimeSpan(definition.options.maxRange)

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
  castedTypeFn: () => '[number, number]',
  populatedTypeFn: () => '[number, number]',
})
