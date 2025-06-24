import type { ResolvedRoute, RouteRedirect, RouteReferenceName } from '#pruvious/server'
import { withoutTrailingSlash, withTrailingSlash } from '@pruvious/utils'
import { stringifyQuery } from 'ufo'
import type { RouteLocationNormalizedGeneric } from 'vue-router'
import { useLanguage } from '../translations/utils.client'

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
 * import { usePruviousRoute } from '#pruvious/client'
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
  // @todo check if current page is used in a preview, and if so, resolve the route data from the window.parent object (client-side only)
  // @todo isPreview() helper in routes/utils.client.ts

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

  const language = useLanguage()
  const nuxtApp = useNuxtApp()
  const handler = () =>
    $fetch<ResolvedRoute | RouteRedirect>(apiBasePath + 'routes' + route.path, {
      headers: { 'Accept-Language': language.value },
    })
  const response = await useAsyncData(`pruvious:routes:${route.path}`, handler, { dedupe: 'defer' }).then(
    ({ data }) => data.value,
  )

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
      useHead({
        title: response.seo.title,
        meta: [
          { name: 'description', content: response.seo.description },
          { property: 'og:title', content: response.seo.title },
          { property: 'og:description', content: response.seo.description },
          // { property: 'og:image', content: response.seo.image }, @todo
          { property: 'og:url', content: response.seo.url },
          { name: 'twitter:title', content: response.seo.title },
          { name: 'twitter:description', content: response.seo.description },
          // { name: 'twitter:image', content: response.seo.image }, @todo
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'robots', content: response.seo.isIndexable ? 'index, follow' : 'noindex, nofollow' },
        ],
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
