import { defineField } from '#pruvious/server'
import { booleanFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Defines the visual style variant of the switch.
     *
     * @default 'accent'
     */
    variant?: 'primary' | 'accent'
  }
} = {
  ui: {
    variant: 'accent',
  },
}

export default defineField({
  model: booleanFieldModel(),
  customOptions,
})
