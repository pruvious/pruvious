import { defineField } from '#pruvious/server'
import { booleanFieldModel } from '@pruvious/orm'

const customOptions: {
  ui?: {
    /**
     * Defines the visual style variant of the switch.
     *
     * @default 'primary'
     */
    variant?: 'primary' | 'accent'
  }
} = {
  ui: {
    variant: 'primary',
  },
}

export default defineField({
  model: booleanFieldModel(),
  customOptions,
})
