import type { ResolvedRoute, RouteRedirect, RouteReferenceName } from '#pruvious/server'
import { withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'
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

/**
 * Resolves the Pruvious route data based on the provided Vue `route`.
 *
 * - Updates the route state in the `usePruviousRoute` composable.
 * - Handles route redirects automatically (if `pruvious.routing.followRedirects` is enabled).
 * - Sets SEO metadata based on the resolved route (if `pruvious.routing.seo` is enabled).
 *
 * This function is automatically called by the `pruvious` and `pruvious-route` middleware, so you typically do not need to call it manually.
 *
 * @returns a `SimpleRedirect` object or `null` if no redirect is needed.
 */
export async function resolvePruviousRoute(route: RouteLocationNormalizedGeneric): Promise<SimpleRedirect | null> {
  if (isPreview(route)) {
    if (import.meta.client) {
      const { initializePreview } = await import('../preview/utils.client')
      initializePreview()
    }
    useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
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
        external: to.startsWith('http'),
      }
    }
  } else {
    pruviousRoute.value = response

    if (routing.seo) {
      const sharingImage = response.seo.sharingImage
      const baseline: { attribute: 'name' | 'property'; key: string; content: string }[] = [
        { attribute: 'name', key: 'description', content: response.seo.description },
        { attribute: 'property', key: 'og:title', content: response.seo.title },
        { attribute: 'property', key: 'og:description', content: response.seo.description },
        { attribute: 'property', key: 'og:url', content: response.seo.url },
        { attribute: 'name', key: 'twitter:title', content: response.seo.title },
        { attribute: 'name', key: 'twitter:description', content: response.seo.description },
        { attribute: 'name', key: 'twitter:card', content: 'summary_large_image' },
        { attribute: 'name', key: 'robots', content: response.seo.isIndexable ? 'index, follow' : 'noindex, nofollow' },
      ]

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

      const userKeys = new Set(response.seo.metaTags.map((tag) => `${tag.attribute}:${tag.key}`))
      const meta = [
        ...baseline.filter((entry) => !userKeys.has(`${entry.attribute}:${entry.key}`)),
        ...response.seo.metaTags,
      ].map((entry) => ({ [entry.attribute]: entry.key, content: entry.content }))

      useHead({ title: response.seo.title, meta })
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
