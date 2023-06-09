import { Script } from '@pruvious-test/build'

/** @type import('@pruvious-test/build').ScriptOptions */
const options = {
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: [
    '@babel/code-frame',
    '@pruvious-test/build',
    '@pruvious-test/utils',
    '@pruvious-test/zip',
    'adm-zip',
    'args',
    'child_process',
    'crypto',
    'dayjs',
    'detect-port',
    'esbuild',
    'fs-extra',
    'glob',
    'inquirer',
    'kill-port',
    'node-ssh',
    'os',
    'path',
    'picocolors',
    'prettier-plugin-organize-attributes',
    'prettier-plugin-tailwindcss',
    'sshpk',
    'terminal-kit',
    'typescript',
  ],
}

new Script({
  ...options,
  input: 'src/index.ts',
  output: 'dist/index.js',
  platform: 'neutral',
  name: 'ESM',
}).build()

new Script({
  ...options,
  input: 'src/index.ts',
  output: 'dist/index.cjs',
  platform: 'node',
  declarations: false,
  name: 'CJS',
}).build()

new Script({
  ...options,
  input: 'src/bin.ts',
  output: 'dist/bin.cjs',
  platform: 'node',
  declarations: false,
  name: 'BIN',
}).build()
