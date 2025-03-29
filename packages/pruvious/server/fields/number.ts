import { defineField } from '#pruvious/server'
import { numberFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Specifies whether the input should automatically get the width of its content.
     *
     * @default false
     */
    autoWidth?: boolean

    /**
     * Defines the axis along which the drag button can be moved.
     * The movement direction affects how the input value changes.
     *
     * @default 'horizontal'
     */
    dragDirection?: 'horizontal' | 'vertical'

    /**
     * The amount to increment the input value when using the arrow keys or dragging the icon.
     *
     * @default 1
     */
    increment?: number

    /**
     * The total number of digits to pad with leading zeros.
     * For example, if `padZeros` is `4`, the number `42` will be displayed as '0042'.
     * Set to `0` to disable padding.
     *
     * @default 0
     */
    padZeros?: number

    /**
     * Controls the visibility of the drag button element.
     * When enabled, users can interact with this button to adjust values.
     *
     * @default false
     */
    showDragButton?: boolean

    /**
     * Controls the visibility of the stepper buttons.
     * When enabled, users can interact with these buttons to adjust values.
     *
     * @default false
     */
    showSteppers?: boolean

    /**
     * An optional suffix to display after the input value.
     */
    suffix?: string
  }
} = {
  ui: {
    autoWidth: false,
    dragDirection: 'horizontal',
    increment: 1,
    padZeros: 0,
    showDragButton: false,
    showSteppers: false,
    suffix: '',
  },
}

export default defineField({
  model: numberFieldModel(),
  customOptions,
  uiOptions: { placeholder: true },
})
