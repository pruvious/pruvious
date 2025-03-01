import { pruviousDashboardPost, QueryBuilder } from '#pruvious/client'
import { type LogsDatabase } from '#pruvious/server'
import { slugify } from '@pruvious/utils'

/**
 * Creates a client-side `QueryBuilder` for logs collections.
 * Enables type-safe inserting of collection records through HTTP requests.
 *
 * This class instance is intended for use in the Pruvious dashboard.
 */
export const logsQueryBuilder = new QueryBuilder<LogsDatabase['collections']>({
  apiRouteResolver: {
    read: (collectionName) => `logs/${slugify(collectionName)}/query/read`,
    delete: (collectionName) => `logs/${slugify(collectionName)}/query/delete`,
  },
  fetcher: pruviousDashboardPost,
})
