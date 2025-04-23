import { blocksField, defineTemplate } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    blocks: blocksField({}),
  },
}))
