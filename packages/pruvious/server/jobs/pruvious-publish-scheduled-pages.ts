import { collections, defineJob, selectFrom, update, type Collections } from '#pruvious/server'

/**
 * Sweeps every routed collection on a fixed interval and flips drafts whose `scheduledAt` has elapsed
 * to `isPublic = true`. Handles both the standard single-field pattern (e.g. `Pages.isPublic` /
 * `Pages.scheduledAt`) and the `Routes` collection's per-language pairs (`isPublicEN` / `scheduledAtEN`,
 * etc.). Going through the regular `update()` API ensures the `afterQueryExecution` hooks fire so the
 * link index is rebuilt and the page cache is cleared.
 */
export default defineJob({
  schedule: { interval: '60s' },
  retry: false,
  logs: false,
  handler: async () => {
    const now = Date.now()
    const languages = useRuntimeConfig().pruvious.i18n.languages.map(({ code }: { code: string }) => code)
    const flipped: Record<string, number> = {}

    for (const [name, collection] of Object.entries(collections as Collections) as [string, any][]) {
      const meta = collection.meta

      if (meta?.routing?.enabled && meta.routing.isPublic?.enabled && meta.routing.scheduledAt?.enabled) {
        const count = await flip(name, 'isPublic', 'scheduledAt', 'subpath', now)
        if (count > 0) {
          flipped[name] = count
        }
      }

      for (const code of languages) {
        const suffix = code.toUpperCase()
        const isPublicField = `isPublic${suffix}`
        const scheduledAtField = `scheduledAt${suffix}`
        const pathField = `path${suffix}`

        if (!collection.fields?.[isPublicField] || !collection.fields?.[scheduledAtField]) {
          continue
        }

        const count = await flip(name, isPublicField, scheduledAtField, pathField, now)
        if (count > 0) {
          flipped[`${name}.${code}`] = count
        }
      }
    }

    return flipped
  },
})

/**
 * `isPublic` carries its own conditional logic gating it on the routing path (`subpath` for standard
 * collections, `path{LANG}` for `Routes`), so the update API refuses a `set({ isPublic: true })` that
 * does not also carry the referenced field. We pre-select id + path, then re-submit each through the
 * full update pipeline (one round-trip per record) so validators, hooks, and link-index/page-cache
 * invalidation still fire.
 */
async function flip(
  collectionName: string,
  isPublicField: string,
  scheduledAtField: string,
  pathField: string,
  now: number,
): Promise<number> {
  const selected = await (selectFrom as any)(collectionName)
    .select(['id', pathField])
    .where(isPublicField, '=', false)
    .where(scheduledAtField, '!=', null)
    .where(scheduledAtField, '<=', now)
    .all()

  if (!selected.success || !selected.data?.length) {
    return 0
  }

  let count = 0

  for (const row of selected.data) {
    const result = await (update as any)(collectionName)
      .set({ [isPublicField]: true, [pathField]: row[pathField] })
      .where('id', '=', row.id)
      .run()

    if (result.success) {
      count++
    }
  }

  return count
}
