import { resolvePruviousRoute } from '#pruvious/client'

/**
 * Pruvious client middleware responsible for resolving routes and handling redirects.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await resolvePruviousRoute(to)

  if (redirect) {
    return navigateTo(redirect.to, redirect)
  }
})
