import { defineJob } from '../job.definition'

export default defineJob({
  name: 'publish-pages',
  callback: async () => {
    const { query } = await import('#pruvious/server')
    const { collections } = await import('#pruvious/collections')

    for (const c of Object.values(collections)) {
      if (c.publicPages && c.publicPages.publishDateField && c.publicPages.publicField) {
        await (query as any)(c.name)
          .where(c.publicPages.publicField, false)
          .whereLte(c.publicPages.publishDateField, Date.now())
          .update({ [c.publicPages.publicField]: true })
      }
    }
  },
  interval: 60,
})
