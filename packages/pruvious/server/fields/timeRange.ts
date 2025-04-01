import { defineField } from '#pruvious/server'
import { arrayFieldModel } from '@pruvious/orm'

const customOptions: {
  /**
   * The minimum allowed time for both inputs.
   * The value must be specified in seconds (e.g., `3600` for 01:00:00).
   *
   * @default 0
   */
  min?: number

  /**
   * The maximum allowed time for both inputs.
   * The value must be specified in seconds (e.g., `7200` for 02:00:00).
   *
   * @default 86399
   */
  max?: number

  /**
   * The minimum range of the time range in seconds.
   * By default, both time values can be the same.
   *
   * @default 0
   */
  minRange?: number

  /**
   * The maximum range of the time range in seconds.
   * By default, the maximum range is 86399 seconds (23:59:59).
   *
   * @default 86399
   */
  maxRange?: number

  ui?: {
    /**
     * The position of the decorator that connects the two inputs.
     * It can be `left`, `right`, or `hidden`.
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
  max: 86399,
  minRange: 0,
  maxRange: 86399,
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
  default: [0, 86399],
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
