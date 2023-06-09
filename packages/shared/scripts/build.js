import { Script } from '@pruvious-test/build'

/** @type import('@pruvious-test/build').ScriptOptions */
const options = {
  input: 'src/index.ts',
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
}

new Script({
  ...options,
  output: 'dist/index.js',
  platform: 'neutral',
  name: 'ESM',
  emptyOutputDir: true,
  external: ['@pruvious-test/utils', 'nanoid', 'qs'],
}).build()

new Script({
  ...options,
  output: 'dist/index.cjs',
  platform: 'node',
  declarations: false,
  name: 'CJS',
  external: ['@pruvious-test/utils', 'qs'],
}).build()
