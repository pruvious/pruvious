import { blocksField, defineSingleton } from '#pruvious/server'

export default defineSingleton({
  fields: {
    blocks: blocksField({}),
  },
})
