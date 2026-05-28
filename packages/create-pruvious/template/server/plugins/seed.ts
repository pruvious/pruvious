import { database, parseConditionalLogic, primaryLanguage } from '#pruvious/server'

/**
 * Seeds a starter homepage on the first request.
 *
 * When the database has no routes yet, this creates a `Pages` record with a few
 * prose blocks plus a `Routes` entry at `/` that points to the `Pages`
 * collection, so a freshly created project renders a real homepage right away.
 *
 * It runs once (guarded by the route count) and lazily on the first request, so
 * the database is guaranteed to be initialized. The queries use the
 * event-independent database query builder because there is no request context
 * inside a Nitro plugin. It is best-effort: any failure is logged and never
 * blocks the server from starting. Delete this file once you have built your
 * own homepage.
 */
let seedPromise: Promise<void> | null = null

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', async () => {
    seedPromise ??= seedHomepage().catch((error) => {
      console.error('[seed] Could not seed the starter homepage:', error)
    })

    await seedPromise
  })
})

async function seedHomepage(): Promise<void> {
  const queryBuilder = database().queryBuilder({ contextLanguage: primaryLanguage })

  const routes = await queryBuilder.selectFrom('Routes').count()

  if (!routes.success || routes.data > 0) {
    return
  }

  const insertPage = queryBuilder.insertInto('Pages')
  insertPage.parseConditionalLogic = parseConditionalLogic

  const page = await insertPage
    .values({
      language: primaryLanguage,
      subpath: '',
      isPublic: true,
      blocks: [
        {
          $key: 'Prose',
          content: [
            { $key: 'ProseNode', tag: 'h1', text: 'Welcome to Pruvious' },
            {
              $key: 'ProseNode',
              tag: 'p',
              text: 'This homepage was seeded automatically. Edit it from the dashboard at <strong>/dashboard</strong>, or replace these blocks with your own.',
            },
          ],
        },
      ],
    })
    .run()

  if (!page.success) {
    return
  }

  // `pathEN` / `isPublicEN` are the per-language columns of the `Routes`
  // collection for the primary language (`en` by default). Adjust the `EN`
  // suffix if you change `pruvious.i18n.primaryLanguage`.
  const insertRoute = queryBuilder.insertInto('Routes')
  insertRoute.parseConditionalLogic = parseConditionalLogic

  await insertRoute
    .values({
      pathEN: '/',
      isPublicEN: true,
      referencedCollections: ['Pages'],
    })
    .run()
}
