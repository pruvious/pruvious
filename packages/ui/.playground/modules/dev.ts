import { withTrailingSlash } from '@pruvious/utils'
import { execa } from 'execa'
import { createResolver, defineNuxtModule } from 'nuxt/kit'
import { join } from 'pathe'

export default defineNuxtModule({
  setup: async (_, nuxt) => {
    const { resolve } = createResolver(import.meta.url)
    const rootDir = resolve('../..')
    const watch = [
      join(rootDir, 'assets'),
      join(rootDir, 'components'),
      join(rootDir, 'pui'),
      join(rootDir, 'nuxt.config.ts'),
      join(rootDir, 'styles.ts'),
    ].map(withTrailingSlash)

    await execa('node', [join(rootDir, 'scripts/build.mjs')], { stdio: 'inherit' })

    nuxt.hook('builder:watch', async (event, path) => {
      if (
        (event === 'add' || event === 'change' || event === 'unlink') &&
        watch.some((w) => w === path || path.startsWith(w))
      ) {
        await execa('node', [join(rootDir, 'scripts/build.mjs'), `--${event}`, path], { stdio: 'inherit' })
      }
    })
  },
})
