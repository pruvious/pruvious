import { hashSources } from '@pruvious/cli-utils'
import { execa } from 'execa'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'pathe'

const url = new URL(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(url)), '..')
const outputDir = join(rootDir, '.output')
const sources = [
  'app',
  'public',
  'scripts',
  'server',
  'LICENSE',
  'nuxt.config.ts',
  'package.json',
  'pnpm-workspace.yaml',
  'README.md',
  'tsconfig.json',
].map((file) => join(rootDir, file))
const hash = hashSources(sources)
const currentHashFile = join(rootDir, '.build')

if (
  !fs.existsSync(join(outputDir, 'server', 'index.mjs')) ||
  !fs.existsSync(currentHashFile) ||
  fs.readFileSync(currentHashFile, 'utf-8') !== hash
) {
  await execa('pnpm', ['exec', 'nuxt', 'build'], { cwd: rootDir, stdio: 'inherit' })
  fs.writeFileSync(currentHashFile, hash, 'utf-8')
}

const distDir = join(rootDir, 'dist')

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true })
}

const publicSrc = join(rootDir, '.output/public')
const publicDest = join(distDir, 'public')
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true })
}

const serverSrc = join(rootDir, '.output/server')
const serverDest = join(distDir, 'server')
if (fs.existsSync(serverSrc)) {
  fs.cpSync(serverSrc, serverDest, { recursive: true, filter: (src) => !src.includes('node_modules') })
}

const nitroSrc = join(rootDir, '.output/nitro.json')
const nitroDest = join(distDir, 'nitro.json')
if (fs.existsSync(nitroSrc)) {
  fs.copyFileSync(nitroSrc, nitroDest)
}
