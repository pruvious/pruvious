import { Script } from '@pruvious/build'

/** @type import('@pruvious/build').ScriptOptions */
const options = {
  input: 'src/index.ts',
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: [
    '@babel/code-frame',
    '@pruvious/build',
    '@pruject/dev',
    '@pruvious/utils',
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
