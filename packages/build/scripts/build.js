import { spawn, spawnSync } from 'child_process'
import esbuild from 'esbuild'
import fs from 'fs-extra'

fs.emptyDirSync('dist')
fs.emptyDirSync('types')

/** @type {import('esbuild').BuildOptions} */
const baseOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: !process.argv.includes('--watch'),
  watch: process.argv.includes('--watch'),
  external: [
    '@babel/code-frame',
    '@pruvious-test/utils',
    'child_process',
    'esbuild',
    'fs-extra',
    'path',
    'picocolors',
    'typescript',
  ],
}

esbuild.build({
  ...baseOptions,
  outfile: 'dist/index.js',
  platform: 'neutral',
  mainFields: ['module', 'main'],
})

esbuild.build({
  ...baseOptions,
  outfile: 'dist/index.cjs',
  platform: 'node',
  target: ['node16.3.0'],
})

if (process.argv.includes('--watch')) {
  spawn('tsc --watch --preserveWatchOutput', { shell: true, stdio: 'inherit' })
} else {
  spawnSync('tsc', { shell: true, stdio: 'inherit' })
}
