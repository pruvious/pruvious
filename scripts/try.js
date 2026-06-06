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
const tryAppDir = path.resolve(tryPath, 'app')
const tryAppVuePath = path.resolve(tryPath, 'app.vue')
const tryAppVuePathSrcDir = path.resolve(tryAppDir, 'app.vue')
const tryEcosystem = path.resolve(tryPath, 'ecosystem.config.cjs')
const execaOptions = { shell: true, stdout: 'inherit', stderr: 'inherit' }
const useLegacyLayout = process.argv.includes('--legacy-layout')

console.log(`Using ${useLegacyLayout ? 'legacy (root srcDir)' : 'Nuxt 4 (app/ srcDir)'} folder structure`)

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
fs.rmSync(tryPath, { recursive: true, force: true })

/*
|--------------------------------------------------------------------------
| Install fresh Nuxt app
|--------------------------------------------------------------------------
|
*/
await execa(
  `pnpm dlx nuxi@latest init ${tryDirname} --template minimal --packageManager pnpm --gitInit --force --no-install`,
  { ...execaOptions, cwd: parentPath, input: '\n\n\n\n' },
)
fs.writeFileSync(
  path.resolve(tryPath, 'pnpm-workspace.yaml'),
  [
    'allowBuilds:',
    "  '@parcel/watcher': true",
    '  argon2: true',
    '  cpu-features: true',
    '  esbuild: true',
    '  sharp: true',
    '  sqlite3: true',
    '  ssh2: true',
    '  vue-demi: true',
    '',
  ].join('\n'),
)
await execa(`pnpm i ../${dirname}/${tgz}`, { ...execaOptions, cwd: tryPath })

/*
|--------------------------------------------------------------------------
| Flip to legacy folder structure
|--------------------------------------------------------------------------
|
*/
if (useLegacyLayout) {
  fs.removeSync(tryAppDir)
}

/*
|--------------------------------------------------------------------------
| Add Pruvious module to Nuxt config
|--------------------------------------------------------------------------
|
*/
const nuxtConfig = await loadFile(tryNuxtConfigPath, { trailingComma: true })
addNuxtModule(nuxtConfig, 'pruvious')
if (useLegacyLayout) {
  nuxtConfig.exports.default.$args[0].srcDir = '.'
}
await writeFile(nuxtConfig, tryNuxtConfigPath)

/*
|--------------------------------------------------------------------------
| Update app.vue
|--------------------------------------------------------------------------
|
*/
const appVueContent = ['<template>', '  <NuxtPage />', '</template>', ''].join('\n')
fs.writeFileSync(fs.existsSync(tryAppDir) ? tryAppVuePathSrcDir : tryAppVuePath, appVueContent)

/*
|--------------------------------------------------------------------------
| Seed example collection and blocks
|--------------------------------------------------------------------------
|
*/
const contentBase = fs.existsSync(tryAppDir) ? tryAppDir : tryPath
const collectionsDir = path.resolve(contentBase, 'collections')
const blocksDir = path.resolve(contentBase, 'blocks')
fs.ensureDirSync(collectionsDir)
fs.ensureDirSync(blocksDir)

fs.writeFileSync(
  path.resolve(collectionsDir, 'articles.ts'),
  [
    `import { defineCollection } from '#pruvious'`,
    ``,
    `export default defineCollection({`,
    `  name: 'articles',`,
    `  mode: 'multi',`,
    `  fields: {`,
    `    title: {`,
    `      type: 'text',`,
    `      options: { required: true, default: 'Untitled' },`,
    `    },`,
    `    body: {`,
    `      type: 'text-area',`,
    `      options: { default: '' },`,
    `    },`,
    `    isPublished: {`,
    `      type: 'switch',`,
    `      options: { default: false },`,
    `    },`,
    `  },`,
    `})`,
    ``,
  ].join('\n'),
)

fs.writeFileSync(
  path.resolve(blocksDir, 'Hero.vue'),
  [
    `<template>`,
    `  <section style="padding: 2rem; background: #f5f5f5;">`,
    `    <h1>{{ title }}</h1>`,
    `    <p>{{ subtitle }}</p>`,
    `  </section>`,
    `</template>`,
    ``,
    `<script lang="ts" setup>`,
    `import { textField } from '#pruvious'`,
    ``,
    `defineProps({`,
    `  title: textField({ required: true, default: 'Hero title' }),`,
    `  subtitle: textField({ default: 'A short subtitle' }),`,
    `})`,
    `</script>`,
    ``,
  ].join('\n'),
)

fs.writeFileSync(
  path.resolve(blocksDir, 'Container.vue'),
  [
    `<template>`,
    `  <div style="padding: 1rem; border: 1px solid #ddd;">`,
    `    <slot />`,
    `  </div>`,
    `</template>`,
    ``,
    `<script lang="ts" setup>`,
    `import { defineBlock } from '#pruvious'`,
    ``,
    `defineBlock({`,
    `  slots: { default: { allowedChildBlocks: ['Hero', 'ArticleList'] } },`,
    `})`,
    ``,
    `defineProps({})`,
    `</script>`,
    ``,
  ].join('\n'),
)

fs.writeFileSync(
  path.resolve(blocksDir, 'ArticleList.vue'),
  [
    `<template>`,
    `  <section style="padding: 1.5rem;">`,
    `    <h2>{{ heading }}</h2>`,
    `    <ul v-if="articles?.length" style="list-style: none; padding: 0;">`,
    `      <li v-for="article in articles" :key="article.id" style="margin: 0.5rem 0; padding: 0.75rem; border: 1px solid #eee;">`,
    `        <strong>{{ article.title }}</strong>`,
    `        <span v-if="article.isPublished" style="color: green; margin-left: 0.5rem;">(published)</span>`,
    `        <p v-if="article.body" style="margin: 0.25rem 0 0; color: #555;">{{ article.body }}</p>`,
    `      </li>`,
    `    </ul>`,
    `    <p v-else style="color: #888;">No articles selected.</p>`,
    `  </section>`,
    `</template>`,
    ``,
    `<script lang="ts" setup>`,
    `import { recordsField, textField } from '#pruvious'`,
    ``,
    `defineProps({`,
    `  heading: textField({ default: 'Latest articles' }),`,
    `  articles: recordsField({`,
    `    collection: 'articles',`,
    `    populate: true,`,
    `    fields: { id: true, title: true, body: true, isPublished: true },`,
    `  }),`,
    `})`,
    `</script>`,
    ``,
  ].join('\n'),
)

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
