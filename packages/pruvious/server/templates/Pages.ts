import { blocksField, defineTemplate } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    blocks: blocksField({}),
  },
  routing: {
    publicFields: ['blocks', 'seo', 'createdAt', 'updatedAt'],
    subpath: { allowEmptyString: true },
    isPublic: true,
    scheduledAt: true,
    seo: true,
  },
}))
