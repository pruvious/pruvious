import { setup } from '@nuxt/test-utils/e2e'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe } from 'vitest'

describe('cms', async () => {
  const tmpDir = fileURLToPath(new URL('tmp', import.meta.url))

  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true })
  }

  await setup({ rootDir: fileURLToPath(new URL('..', import.meta.url)) })

  // Installation
  await import('./cms/installation')

  // Auth
  await import('./cms/auth')

  // Collections
  await import('./cms/collections/users')
  await import('./cms/collections/public')

  // Fields
  await import('./cms/fields/date')
  await import('./cms/fields/dateRange')
  await import('./cms/fields/dateTime')
  await import('./cms/fields/dateTimeRange')
  await import('./cms/fields/time')
  await import('./cms/fields/timeRange')
  await import('./cms/fields/timestamp')
})
