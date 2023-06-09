import { useRoute } from '#imports'
import { Link } from '@pruvious/shared'

/**
 * Determine if a `link` is active based on the current route.
 */
export function isActiveLink(
  link?: Link | null,
  match: 'startsWith' | 'exact' | 'exactWithFragment' = 'startsWith',
): boolean {
  if (!link) {
    return false
  }

  const route = useRoute()
  const routePath = route.fullPath.split('#')[0]
  const linkPath = link?.path || link?.url

  if (match === 'startsWith') {
    return linkPath === '/' ? routePath === '/' : route.fullPath.startsWith(linkPath)
  } else if (match === 'exact') {
    return linkPath === routePath
  } else {
    return linkPath === route.fullPath
  }
}
