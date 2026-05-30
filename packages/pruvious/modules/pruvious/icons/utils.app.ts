import { isEmpty, isString } from '@pruvious/utils'
import { ref } from 'vue'

export const iconCacheBuster = ref(0)

if (import.meta.dev && import.meta.client && import.meta.hot) {
  import.meta.hot.on('pruvious:reload', () => {
    iconCacheBuster.value++
  })
}

/**
 * Builds the public URL for an icon. The first configured directory is mounted at
 * `/_pruvious/icons/`; additional directories are mounted under their prefix.
 */
export function buildIconUrl(dir: string | null | undefined, name: string): string {
  const dirs = useRuntimeConfig().public.pruvious.iconsDirs
  const firstPrefix = dirs[0]?.prefix ?? ''
  const requested = isString(dir) && !isEmpty(dir) ? dir : firstPrefix
  const encodedName = encodeURIComponent(name)
  const suffix = import.meta.dev && iconCacheBuster.value > 0 ? `?v=${iconCacheBuster.value}` : ''

  if (requested === firstPrefix) {
    return `/_pruvious/icons/${encodedName}.svg${suffix}`
  }

  return `/_pruvious/icons/${encodeURIComponent(requested)}/${encodedName}.svg${suffix}`
}
