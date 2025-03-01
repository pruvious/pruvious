import { defineField } from '#pruvious/server'
import { numberFieldModel } from '@pruvious/orm'

const customOptions: {} = {}

export default defineField({
  model: numberFieldModel(),
  customOptions,
})
