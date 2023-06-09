import { Script } from '@pruvious/build'

/** @type import('@pruvious/build').ScriptOptions */
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
  external: ['@pruvious/utils', 'nanoid', 'qs'],
}).build()

new Script({
  ...options,
  output: 'dist/index.cjs',
  platform: 'node',
  declarations: false,
  name: 'CJS',
  external: ['@pruvious/utils', 'qs'],
}).build()
