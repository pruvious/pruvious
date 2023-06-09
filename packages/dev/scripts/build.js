import { Script } from '@pruvious/build'

/** @type import('@pruvious/build').ScriptOptions */
const options = {
  input: 'src/index.ts',
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: [
    '@babel/code-frame',
    '@parcel/watcher',
    '@pruvious/build',
    'args',
    'detect-port',
    'esbuild',
    'fs',
    'glob',
    'kill-port',
    'os',
    'path',
    'terminate',
    'typescript',
  ],
}

new Script({
  ...options,
  output: 'dist/index.js',
  platform: 'neutral',
  name: 'ESM',
  emptyOutputDir: true,
}).build()

new Script({
  ...options,
  output: 'dist/index.cjs',
  platform: 'node',
  declarations: false,
  name: 'CJS',
}).build()
