import { Script } from '@pruvious/build'

/** @type import('@pruvious/build').ScriptOptions */
const options = {
  input: 'src/index.ts',
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: ['fs', 'fs-extra', 'path', 'picocolors', 'prompt-sync'],
}

new Script({
  ...options,
  output: 'dist/index.js',
  platform: 'neutral',
  name: 'ESM',
}).build()

new Script({
  ...options,
  output: 'dist/index.cjs',
  platform: 'node',
  declarations: false,
  name: 'CJS',
}).build()
