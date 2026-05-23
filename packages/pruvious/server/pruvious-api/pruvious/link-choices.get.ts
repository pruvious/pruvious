import {
  assertUserPermissions,
  collections,
  getLinkIndex,
  normalizeRoutePath,
  type Collections,
  type LanguageCode,
} from '#pruvious/server'
import { buildRelURL, isDefined, isNull, isString, kebabCase, parseRelURL } from '@pruvious/utils'

interface LinkChoice {
  value: string
  label: string
  detail: string
  editUrl: string
  isPublic: boolean
  languages: Record<string, string | null>
}

interface LinkChoicesResult {
  data: LinkChoice[]
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

/** Paginated list of internal link targets for the dashboard link picker, served from the link index. */
export default defineEventHandler(async (event): Promise<LinkChoicesResult> => {
  assertUserPermissions(event, ['access-dashboard'])

  const query = getQuery(event)
  const runtimeConfig = useRuntimeConfig()
  const { languages, primaryLanguage, prefixPrimaryLanguage } = runtimeConfig.pruvious.i18n
  const dashboardBase: string = runtimeConfig.pruvious.dashboard.basePath
  const configuredCodes = languages.map(({ code }) => code)

  const language = (
    isString(query.language) && configuredCodes.includes(query.language) ? query.language : primaryLanguage
  ) as LanguageCode

  let browseLanguages = (
    isString(query.languages) && query.languages !== ''
      ? query.languages
          .split(',')
          .map((s) => s.trim())
          .filter((code) => configuredCodes.includes(code))
      : []
  ) as LanguageCode[]
  if (!browseLanguages.length) {
    browseLanguages = [language]
  }

  const search = (isString(query.q) ? query.q : '').trim()
  const searchTokens = search ? search.toLowerCase().split(/\s+/).filter(Boolean) : []
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
  const perPage = Math.max(1, Math.min(100, Number.parseInt(String(query.perPage ?? '50'), 10) || 50))

  const allowDrafts = query.allowDrafts !== 'false'

  let allowedNames: Set<string> | null = null
  if (isString(query.allowedReferences) && query.allowedReferences !== '*' && query.allowedReferences !== '') {
    allowedNames = new Set(
      query.allowedReferences
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }

  const langPrefix = (code: string) => (code !== primaryLanguage || prefixPrimaryLanguage ? `/${code}` : '')
  const matchesSearch = (haystack: string) => searchTokens.every((token) => haystack.includes(token))

  const index = await getLinkIndex()

  // Single-value resolution mode: hydrate the row metadata for an existing `rel://` link value.
  if (isString(query.value) && query.value !== '') {
    const empty: LinkChoicesResult = { data: [], currentPage: 1, lastPage: 1, perPage, total: 0 }
    const parsed = parseRelURL(query.value, primaryLanguage)
    if (!parsed) {
      return empty
    }

    const valueLanguage = parsed.language as LanguageCode
    if (!configuredCodes.includes(valueLanguage)) {
      return empty
    }

    const route = index.routes.find((r) => r.id === parsed.routeId)
    if (!route) {
      return empty
    }

    const routePath = route.path[valueLanguage]
    if (isNull(routePath ?? null)) {
      return empty
    }

    const valueLanguagePrefix = langPrefix(valueLanguage)

    if (parsed.collection && isDefined(parsed.recordId)) {
      const collection = collections[parsed.collection as keyof Collections] as any
      if (!collection?.meta?.routing?.enabled) {
        return empty
      }

      const translatable = !!collection.meta.translatable
      const record = (index.records[parsed.collection] ?? []).find(
        (r) => r.id === parsed.recordId && (!translatable || r.language === valueLanguage),
      )
      if (!record) {
        return empty
      }

      const detail = normalizeRoutePath(`${valueLanguagePrefix}/${routePath}/${record.subpath}`)
      return {
        data: [
          {
            value: query.value,
            label: record.label || `#${record.id}`,
            detail,
            editUrl: `${dashboardBase}collections/${kebabCase(parsed.collection)}/${record.id}`,
            isPublic: route.isPublic[valueLanguage] === true && record.isPublic,
            languages: { [valueLanguage]: detail },
          },
        ],
        currentPage: 1,
        lastPage: 1,
        perPage,
        total: 1,
      }
    }

    const detail = normalizeRoutePath(valueLanguagePrefix + routePath)
    return {
      data: [
        {
          value: query.value,
          label: isString(route.referencedSingleton) ? route.referencedSingleton : (routePath as string),
          detail,
          editUrl: `${dashboardBase}collections/routes/${parsed.routeId}`,
          isPublic: route.isPublic[valueLanguage] === true,
          languages: { [valueLanguage]: detail },
        },
      ],
      currentPage: 1,
      lastPage: 1,
      perPage,
      total: 1,
    }
  }

  // Browse mode: rows are grouped by requested language, each group sorted by resolved path.
  const rows: LinkChoice[] = []

  for (const browseLanguage of browseLanguages) {
    const prefix = langPrefix(browseLanguage)
    const languagePin = browseLanguage === primaryLanguage ? undefined : browseLanguage
    const languageRows: LinkChoice[] = []

    const routesInLanguage = index.routes.filter((route) => {
      if (isNull(route.path[browseLanguage] ?? null)) {
        return false
      }
      if (!allowDrafts && route.isPublic[browseLanguage] !== true) {
        return false
      }
      return true
    })

    for (const route of routesInLanguage) {
      const routePath = route.path[browseLanguage]!
      const offerBareRoute = !!route.referencedSingleton || route.referencedCollections.length === 0

      if (offerBareRoute && (!allowedNames || allowedNames.has('Routes'))) {
        const label = isString(route.referencedSingleton) ? route.referencedSingleton : routePath
        const detail = normalizeRoutePath(prefix + routePath)
        if (matchesSearch(`${label} ${detail}`.toLowerCase())) {
          languageRows.push({
            value: buildRelURL({ routeId: route.id, language: languagePin }),
            label,
            detail,
            editUrl: `${dashboardBase}collections/routes/${route.id}`,
            isPublic: route.isPublic[browseLanguage] === true,
            languages: { [browseLanguage]: detail },
          })
        }
      }

      for (const collectionName of route.referencedCollections) {
        if (allowedNames && !allowedNames.has(collectionName)) {
          continue
        }

        const collection = collections[collectionName as keyof Collections] as any
        if (!collection?.meta?.routing?.enabled) {
          continue
        }

        const translatable = !!collection.meta.translatable
        const collectionSlug = kebabCase(collectionName)

        for (const record of index.records[collectionName] ?? []) {
          if (translatable && record.language !== browseLanguage) {
            continue
          }
          if (!allowDrafts && !record.isPublic) {
            continue
          }
          const detail = normalizeRoutePath(`${prefix}/${routePath}/${record.subpath}`)
          if (!matchesSearch(`${record.search} ${detail.toLowerCase()}`)) {
            continue
          }
          languageRows.push({
            value: buildRelURL({
              routeId: route.id,
              collection: collectionName,
              recordId: record.id,
              language: languagePin,
            }),
            label: record.label || `#${record.id}`,
            detail,
            editUrl: `${dashboardBase}collections/${collectionSlug}/${record.id}`,
            isPublic: route.isPublic[browseLanguage] === true && record.isPublic,
            languages: { [browseLanguage]: detail },
          })
        }
      }
    }

    languageRows.sort((a, b) => (a.detail < b.detail ? -1 : a.detail > b.detail ? 1 : 0))
    for (const row of languageRows) {
      rows.push(row)
    }
  }

  const total = rows.length
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage

  return { data: rows.slice(start, start + perPage), currentPage: page, lastPage, perPage, total }
})
