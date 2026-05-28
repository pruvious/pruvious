import { database, parseConditionalLogic, primaryLanguage, type Permission } from '#pruvious/server'

/**
 * Seeds starter defaults on the first request:
 *
 * - the `Editor` and `Author` roles (each created only when absent), and
 * - a `Pages` homepage plus a `/` `Route` pointing at the `Pages` collection
 *   (only when no routes exist yet), so a fresh project renders a real homepage.
 *
 * It runs once, lazily on the first request, so the database is guaranteed to be
 * initialized. The queries use the event-independent database query builder
 * because there is no request context inside a Nitro plugin. Each part is
 * best-effort and independent: a failure is logged and never blocks the server
 * from starting. Delete this file once you have your own roles and homepage.
 */
let seedPromise: Promise<void> | null = null

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', async () => {
    seedPromise ??= seedDefaults()

    await seedPromise
  })
})

async function seedDefaults(): Promise<void> {
  await seedRoles().catch((error) => console.error('[seed] Could not seed the default roles:', error))
  await seedHomepage().catch((error) => console.error('[seed] Could not seed the starter homepage:', error))
}

/**
 * Creates the default `Editor` and `Author` roles, each only when a role with
 * that name does not already exist. Admins use the `isAdmin` flag and need no
 * role, so these are for the users you create next.
 */
async function seedRoles(): Promise<void> {
  const queryBuilder = database().queryBuilder({ contextLanguage: primaryLanguage })

  const roles: { name: string; permissions: Permission[] }[] = [
    {
      name: 'Editor',
      permissions: [
        'access-dashboard',
        'update-own-account',
        'preview-drafts',
        'collection:pages:create',
        'collection:pages:read',
        'collection:pages:update',
        'collection:pages:delete',
        'collection:pages:manage',
        'collection:patterns:create',
        'collection:patterns:read',
        'collection:patterns:update',
        'collection:patterns:delete',
        'collection:patterns:manage',
        'collection:uploads:create',
        'collection:uploads:read',
        'collection:uploads:update',
        'collection:uploads:delete',
        'collection:uploads:manage',
        'collection:routes:create',
        'collection:routes:read',
        'collection:routes:update',
        'collection:routes:delete',
        'collection:routes:manage',
        'collection:bookmarks:create',
        'collection:bookmarks:read',
        'collection:bookmarks:update',
        'collection:bookmarks:delete',
        'singleton:seo:read',
        'singleton:seo:update',
      ],
    },
    {
      name: 'Author',
      permissions: [
        'access-dashboard',
        'update-own-account',
        'preview-drafts',
        'collection:pages:create',
        'collection:pages:read',
        'collection:pages:update',
        'collection:pages:delete',
        'collection:patterns:create',
        'collection:patterns:read',
        'collection:patterns:update',
        'collection:patterns:delete',
        'collection:uploads:create',
        'collection:uploads:read',
        'collection:bookmarks:create',
        'collection:bookmarks:read',
        'collection:bookmarks:update',
        'collection:bookmarks:delete',
      ],
    },
  ]

  for (const role of roles) {
    const existing = await queryBuilder.selectFrom('Roles').where('name', '=', role.name).count()

    if (existing.success && existing.data === 0) {
      const insert = queryBuilder.insertInto('Roles')
      insert.parseConditionalLogic = parseConditionalLogic
      await insert.values(role).run()
    }
  }
}

/**
 * Creates a starter homepage (a `Pages` record) plus a `/` `Route` that points
 * at the `Pages` collection, only when no routes exist yet.
 */
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
      seo: { title: 'Homepage' },
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

  // `Routes` stores one set of columns per language, each suffixed with the
  // uppercased, hyphen-stripped language code (e.g. `pathEN`, `pathDEAT`).
  // Deriving the suffix from `primaryLanguage` keeps this seed aligned with the
  // configured `pruvious.i18n` languages instead of assuming English.
  const suffix = primaryLanguage.toUpperCase().replace(/-/g, '')
  const insertRoute = queryBuilder.insertInto('Routes')
  insertRoute.parseConditionalLogic = parseConditionalLogic

  await insertRoute
    .values({
      [`path${suffix}`]: '/',
      [`isPublic${suffix}`]: true,
      referencedCollections: ['Pages'],
    })
    .run()
}
