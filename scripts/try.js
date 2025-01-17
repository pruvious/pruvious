import { execa } from 'execa'
import fs from 'fs-extra'
import { loadFile, writeFile } from 'magicast'
import { addNuxtModule } from 'magicast/helpers'
import path from 'path'

const version = fs.readJsonSync('package.json').version
const tgz = `pruvious-${version}.tgz`
const cwd = process.env.INIT_CWD || process.cwd()
const dirname = path.basename(cwd)
const parentPath = path.resolve(cwd, '..')
const tryDirname = `${dirname}-testflight`
const tryPath = path.resolve(parentPath, tryDirname)
const tryNuxtConfigPath = path.resolve(tryPath, 'nuxt.config.ts')
const tryAppVuePath = path.resolve(tryPath, 'app.vue')
const tryEcosystem = path.resolve(tryPath, 'ecosystem.config.cjs')
const execaOptions = { shell: true, stdout: 'inherit', stderr: 'inherit' }

/*
|--------------------------------------------------------------------------
| Build and pack module
|--------------------------------------------------------------------------
|
*/
if (!process.argv.includes('--nopack')) {
  await execa('pnpm pack', { ...execaOptions })
}

/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
|
*/
fs.rmSync(tryPath, { recursive: true })

/*
|--------------------------------------------------------------------------
| Install fresh Nuxt app
|--------------------------------------------------------------------------
|
*/
await execa(`pnpm dlx nuxi@latest init ${tryDirname} --package-manager pnpm --git-init`, {
  ...execaOptions,
  cwd: parentPath,
})
await execa(`pnpm i ../${dirname}/${tgz}`, { ...execaOptions, cwd: tryPath })

/*
|--------------------------------------------------------------------------
| Add Pruvious module to Nuxt config
|--------------------------------------------------------------------------
|
*/
const nuxtConfig = await loadFile(tryNuxtConfigPath, { trailingComma: true })
addNuxtModule(nuxtConfig, 'pruvious')
await writeFile(nuxtConfig, tryNuxtConfigPath)

/*
|--------------------------------------------------------------------------
| Update app.vue
|--------------------------------------------------------------------------
|
*/
fs.writeFileSync(tryAppVuePath, ['<template>', '  <NuxtPage />', '</template>', ''].join('\n'))

/*
|--------------------------------------------------------------------------
| Create ecosystem.config.cjs
|--------------------------------------------------------------------------
|
*/
fs.writeFileSync(
  tryEcosystem,
  [
    `module.exports = {`,
    `  apps: [`,
    `    {`,
    `      name: 'pruvious',`,
    `      port: 3000,`,
    `      exec_mode: 'cluster',`,
    `      instances: 'max',`,
    `      script: './.output/server/index.mjs',`,
    `    },`,
    `  ],`,
    `}`,
    ``,
  ].join('\n'),
)

/*
|--------------------------------------------------------------------------
| Build, copy to output folder, and run app
|--------------------------------------------------------------------------
|
*/
await execa('pnpm build', { ...execaOptions, cwd: tryPath })
await execa('node ./.output/server/index.mjs', {
  ...execaOptions,
  cwd: tryPath,
  env: {
    NUXT_PRUVIOUS_JWT_SECRET_KEY: 'yyy',
  },
})
