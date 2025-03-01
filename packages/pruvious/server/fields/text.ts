import { defineField } from '#pruvious/server'
import { textFieldModel } from '@pruvious/orm'

export default defineField({
  model: textFieldModel(),
  uiOptions: { placeholder: true },
})
