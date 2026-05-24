import type { ResolvedRoute, RouteRedirect, RouteReferenceName } from '#pruvious/server'
import { toOgLocale, withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'
import { stringifyQuery } from 'ufo'
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import { pruviousFetchHeaders } from '../api/utils.client'

export interface SimpleRedirect {
  to: string
  redirectCode?: number
  external?: boolean
  replace?: boolean
}

/**
 * Composable that provides access to the current route.
 * The route is automatically resolved through the `pruvious-route` middleware.
 *
 * @example
 * ```vue
 * <template>
 *   <NuxtLayout>
 *     <pre>{{ proute }}</pre>
 *   </NuxtLayout>
 * </template>
 *
 * <script lang="ts" setup>
 * import { usePruviousRoute } from '#pruvious/app'
 *
 * const proute = usePruviousRoute()
 * </script>
 * ```
 */
export const usePruviousRoute = <TRef extends RouteReferenceName = RouteReferenceName>() =>
  useState<ResolvedRoute<TRef> | null>('pruvious-route', () => null)

export interface ResolvePruviousRouteOptions {
  /**
   * Whether to emit SEO-related head tags (title, meta, link, script, `htmlAttrs.lang`) for this route.
   *
   * Set to `false` for routes that manage their own document head, or for routes that should
   * not be indexed and should not contribute any SEO signals. The route data is still resolved into
   * `usePruviousRoute` so the page component can render content as usual.
   *
   * @default true
   */
  seo?: boolean
}

/**
 * Resolves the Pruvious route data based on the provided Vue `route`.
 *
 * - Updates the route state in the `usePruviousRoute` composable.
 * - Handles route redirects automatically (if `pruvious.routing.followRedirects` is enabled).
 * - Sets SEO metadata based on the resolved route (if `pruvious.routing.seo` is enabled and `options.seo` is not `false`).
 *
 * This function is automatically called by the `pruvious` and `pruvious-route` middleware, so you typically do not need to call it manually.
 *
 * @returns a `SimpleRedirect` object or `null` if no redirect is needed.
 */
export async function resolvePruviousRoute(
  route: RouteLocationNormalizedGeneric,
  options?: ResolvePruviousRouteOptions,
): Promise<SimpleRedirect | null> {
  if (isPreview(route)) {
    if (import.meta.client) {
      const { initializePreview } = await import('../preview/utils.client')
      initializePreview()
    }
    if (options?.seo !== false) {
      useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' }] })
    }
    return null
  }

  const { apiBasePath, routing } = useRuntimeConfig().public.pruvious
  const pruviousRoute = usePruviousRoute()

  if (route.path !== '/') {
    if (routing.trailingSlash && !route.path.endsWith('/')) {
      pruviousRoute.value = null
      return { to: withTrailingSlash(route.path), redirectCode: 301, replace: true }
    } else if (!routing.trailingSlash && route.path.endsWith('/')) {
      pruviousRoute.value = null
      return { to: withoutTrailingSlash(route.path), redirectCode: 301, replace: true }
    }
  }

  const nuxtApp = useNuxtApp()
  const fetcher = import.meta.server ? useRequestFetch() : $fetch
  const handler = () =>
    fetcher<ResolvedRoute | RouteRedirect>(apiBasePath + 'routes' + route.path, {
      headers: pruviousFetchHeaders(),
    })
  const response =
    import.meta.server || nuxtApp.isHydrating
      ? await useAsyncData(`pruvious:routes:${route.path}`, handler, { dedupe: 'defer' }).then(({ data }) => data.value)
      : await handler()

  if (!response) {
    pruviousRoute.value = null

    if (import.meta.server) {
      throw createError({ statusCode: 404 })
    } else if (!nuxtApp.isHydrating) {
      showError({ statusCode: 404 })
    }
  } else if ('to' in response) {
    pruviousRoute.value = null

    if (routing.followRedirects) {
      let to = response.to

      if (response.forwardQueryParams) {
        const qs = stringifyQuery(route.query)
        if (qs) {
          to += (to.includes('?') ? '&' : '?') + qs
        }
      }

      return {
        to,
        redirectCode: response.code,
        replace: true,
        external: true,
      }
    }
  } else {
    pruviousRoute.value = response

    if (routing.seo && options?.seo !== false) {
      const { languages } = useRuntimeConfig().public.pruvious
      const seo = response.seo
      const sharingImage = seo.sharingImage
      const baseline: { attribute: 'name' | 'property'; key: string; content: string }[] = [
        { attribute: 'name', key: 'description', content: seo.description },
        { attribute: 'property', key: 'og:title', content: seo.title },
        { attribute: 'property', key: 'og:description', content: seo.description },
        { attribute: 'property', key: 'og:url', content: seo.url },
        { attribute: 'property', key: 'og:type', content: seo.ogType },
        { attribute: 'property', key: 'og:site_name', content: seo.siteName },
        { attribute: 'property', key: 'og:locale', content: toOgLocale(response.language) },
        { attribute: 'name', key: 'twitter:title', content: seo.title },
        { attribute: 'name', key: 'twitter:description', content: seo.description },
        { attribute: 'name', key: 'twitter:card', content: sharingImage ? 'summary_large_image' : 'summary' },
        { attribute: 'name', key: 'robots', content: seo.isIndexable ? 'index, follow' : 'noindex, nofollow' },
      ]

      for (const code of languages) {
        if (code !== response.language) {
          baseline.push({ attribute: 'property', key: `og:locale:alternate:${code}`, content: toOgLocale(code) })
        }
      }

      if (sharingImage) {
        baseline.push(
          { attribute: 'property', key: 'og:image', content: sharingImage.url },
          { attribute: 'property', key: 'og:image:type', content: sharingImage.mime },
          { attribute: 'name', key: 'twitter:image', content: sharingImage.url },
        )
        if (sharingImage.width) {
          baseline.push({ attribute: 'property', key: 'og:image:width', content: String(sharingImage.width) })
        }
        if (sharingImage.height) {
          baseline.push({ attribute: 'property', key: 'og:image:height', content: String(sharingImage.height) })
        }
        if (sharingImage.alt) {
          baseline.push(
            { attribute: 'property', key: 'og:image:alt', content: sharingImage.alt },
            { attribute: 'name', key: 'twitter:image:alt', content: sharingImage.alt },
          )
        }
      }

      const userKeys = new Set(seo.metaTags.map((tag) => `${tag.attribute}:${tag.key}`))
      const userOverridesOgImage = userKeys.has('property:og:image')
      const userOverridesTwitterImage = userKeys.has('name:twitter:image')
      const meta = [
        ...baseline.filter((entry) => {
          if (!entry.content || userKeys.has(`${entry.attribute}:${entry.key}`)) {
            return false
          }
          // Suppress companion image tags when the user overrides the primary image.
          // The auto-derived dimensions/mime/alt no longer describe the user's image.
          if (userOverridesOgImage && entry.attribute === 'property' && entry.key.startsWith('og:image:')) {
            return false
          }
          if (userOverridesTwitterImage && entry.attribute === 'name' && entry.key.startsWith('twitter:image:')) {
            return false
          }
          return true
        }),
        ...seo.metaTags,
      ].map((entry) => {
        const key = entry.key.startsWith('og:locale:alternate:') ? 'og:locale:alternate' : entry.key
        return { [entry.attribute]: key, content: entry.content }
      })

      const link: { rel: string; href: string; hreflang?: string; type?: string }[] = []
      if (seo.url) {
        link.push({ rel: 'canonical', href: seo.url })
      }
      for (const alternate of seo.alternates) {
        link.push({ rel: 'alternate', hreflang: alternate.hreflang, href: alternate.href })
      }
      if (seo.favicon) {
        link.push({ rel: 'icon', href: seo.favicon.url, type: seo.favicon.mime })
      }

      const script = seo.jsonLd.length
        ? seo.jsonLd.map((entry) => ({
            type: 'application/ld+json',
            innerHTML: JSON.stringify(entry)
              .replace(/</g, '\\u003c')
              .replace(/\u2028/g, '\\u2028')
              .replace(/\u2029/g, '\\u2029'),
          }))
        : []

      useHead({
        title: seo.title,
        htmlAttrs: { lang: response.language },
        meta,
        link,
        script,
      })
    }

    if (response.softRedirect) {
      return {
        to: response.softRedirect,
        redirectCode: 302,
        replace: true,
      }
    }
  }

  return null
}

/**
 * Checks if the current `route` path is being viewed in preview mode.
 * If the `route` is not provided, it defaults to the current route using `useRoute()`.
 */
export function isPreview(route?: RouteLocationNormalizedGeneric): boolean {
  const { dashboardBasePath } = useRuntimeConfig().public.pruvious
  route ??= useRoute()

  if (import.meta.client && route.path === '/_pruviousPreview' && window.parent !== window) {
    try {
      const parent = new URL(window.parent.location.href)
      return parent.origin === location.origin && parent.pathname.startsWith(dashboardBasePath)
    } catch {}
  }

  return false
}
