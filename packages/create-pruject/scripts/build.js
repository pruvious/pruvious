import { Script } from '@pruvious-test/build'

/** @type import('@pruvious-test/build').ScriptOptions */
const options = {
  input: 'src/index.ts',
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: [
    '@babel/code-frame',
    '@pruvious-test/build',
    '@pruject-test/dev',
    '@pruvious-test/utils',
    'args',
    'child_process',
    'esbuild',
    'fs-extra',
    'inquirer',
    'path',
    'picocolors',
    'terminal-kit',
    'typescript',
  ],
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
