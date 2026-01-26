import { setup } from '@nuxt/test-utils/e2e'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe } from 'vitest'

describe('local-path plugin', async () => {
  const tmpDir = fileURLToPath(new URL('tmp', import.meta.url))

  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true })
  }

  await setup({ rootDir: fileURLToPath(new URL('..', import.meta.url)) })

  // @todo tests using `@pruvious/test-utils` (see `packages/pruvious/.playground/test/cms/utils.ts`)
})
