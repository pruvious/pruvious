import esbuild from 'esbuild'
import { execa } from 'execa'
import fs from 'fs-extra'

const execaOptions = { shell: true, stdout: 'inherit', stderr: 'inherit' }

await execa('pnpm exec tailwindcss -i ./src/styles/index.css -o ./src/runtime/assets/style.css', { ...execaOptions })

fs.emptyDirSync('bin')
fs.emptyDirSync('config')
fs.copyFileSync('src/cli/config/define.ts', 'config/index.ts')

esbuild.build({
  entryPoints: ['src/cli/**/*.ts'],
  outdir: 'bin',
  platform: 'node',
  external: [],
})

execa('nuxt-module-build build', { ...execaOptions })
