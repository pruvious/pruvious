import { createError, showError, useRoute, useState, type Ref } from '#imports'
import type { CollectionName, PopulatedBlockData, SupportedLanguage } from '#pruvious'
import { pruviousFetch } from '../utils/fetch'
import { useLanguage } from './language'

export interface PruviousPage {
  /**
   * The page's unique ID.
   */
  id: number

  /**
   * The page's unique URL path.
   */
  path: string

  /**
   * The page's full URL.
   *
   * Note: The `baseUrl` must be set in the SEO collection.
   */
  url: string

  /**
   * The page's collection name.
   */
  collection: CollectionName

  /**
   * The page's layout.
   */
  layout: string | null

  /**
   * The page's publish date.
   */
  publishDate: number | null

  /**
   * The page's creation date.
   */
  createdAt: number | null

  /**
   * The page's last update date.
   */
  updatedAt: number | null

  /**
   * The resolved page title, incorporating settings from the SEO collection.
   */
  title: string

  /**
   * The page description.
   */
  description: string

  /**
   * The page HTML attributes.
   */
  htmlAttrs: Record<string, string>

  /**
   * The page meta tags.
   */
  meta: { name?: string; property?: string; content: string }[]

  /**
   * The page link tags.
   */
  link: { rel: string; type?: string; href: string; hreflang?: string }[]

  /**
   * The page scripts.
   */
  script: { tagPosition?: 'bodyClose' | 'bodyOpen' | 'head'; type: string; src?: string; innerHTML?: string }[]

  /**
   * The language code of the page.
   */
  language: SupportedLanguage

  /**
   * Key-value pairs of translations for the page, where the key is the language code and the value is the resolved page path.
   */
  translations: Record<SupportedLanguage, string | null>

  /**
   * The blocks that make up the page content.
   */
  blocks: { block: PopulatedBlockData }[]

  /**
   * Additional collection specific page fields.
   */
  fields: Record<string, any>
}

/**
 * The current page.
 */
export const usePage: () => Ref<PruviousPage | null> = () => useState('pruvious-page', () => null)

/**
 * Fetches the page at the specified `path` and sets it as the current page.
 * If no `path` is specified, the current route's path is used.
 *
 * This function automatically sets the `usePage` and `useLanguage` composable values.
 *
 * @returns The redirect options if the page is a redirect, otherwise `null`.
 */
export async function getPage(path?: string): Promise<{ to: string; code: 301 | 302 } | null> {
  const language = useLanguage()
  const page = usePage()
  const route = useRoute()
  const subpath = path ?? route.fullPath
  const response = subpath.includes('__p=')
    ? await pruviousFetch('previews.get', { subpath })
    : await pruviousFetch('pages.get', { subpath })

  if (response.success) {
    if (response.code === 301 || response.code === 302) {
      page.value = null
      return { to: response.data as any, code: response.code }
    } else {
      page.value = response.data
      language.value = response.data.language
    }
  } else {
    page.value = null

    if (process.server) {
      throw createError({ statusCode: 404 })
    } else {
      showError({ statusCode: 404 })
    }
  }

  return null
}
