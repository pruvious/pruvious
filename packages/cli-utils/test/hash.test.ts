import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'pathe'
import { expect, test } from 'vitest'
import { hashSources } from '../src'

test('hash sources', async () => {
  const url = new URL(import.meta.url)
  const rootDir = resolve(dirname(fileURLToPath(url)), '..')
  const sources = ['src', 'test', 'package.json'].map((source) => join(rootDir, source))

  expect(sources[0]).toMatch(/\/packages\/cli-utils\/src$/)
  expect(hashSources(sources)).toMatch(/^[a-f0-9]{64}$/)
})
