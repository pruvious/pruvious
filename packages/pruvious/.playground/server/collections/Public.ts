import { defineCollection, textField } from '#pruvious/server'

export default defineCollection({
  authGuard: false,
  createdAt: false,
  updatedAt: false,
  fields: {
    foo: textField({}),
  },
})
