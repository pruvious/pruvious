import { pc, Spawn } from '@pruvious/build'
import fs from 'fs-extra'
import prettyMs from 'pretty-ms'

/*
|--------------------------------------------------------------------------
| Preparation
|--------------------------------------------------------------------------
|
*/

const start = performance.now()
fs.emptyDirSync('dist')

/*
|--------------------------------------------------------------------------
| Generate icons
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'node scripts/icons.js',
  showOutput: true,
  outputPrefix: `${pc.yellow('ICO')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Generated /)

/*
|--------------------------------------------------------------------------
| Build @pruvious/shared
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w @pruvious/shared',
  showOutput: true,
  outputPrefix: `${pc.dim('SRD')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Build API
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w api',
  showOutput: true,
  outputPrefix: `${pc.blue('API')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/built successfully/)

/*
|--------------------------------------------------------------------------
| Build APP
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w app',
  showOutput: true,
  outputPrefix: `${pc.cyan('APP')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Build at:/)

/*
|--------------------------------------------------------------------------
| Build @pruvious/nuxt
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev:prepare -w @pruvious/nuxt && npm run prepack -w @pruvious/nuxt',
  showOutput: true,
  outputPrefix: `${pc.green('NXT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Total dist size/)

/*
|--------------------------------------------------------------------------
| Build create-pruvious
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run fresh:production',
  cwd: 'packages/api',
  outputPrefix: `${pc.red('CRT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/database\/seeders\/MainSeeder\/Index/)

fs.copySync('packages/api/database.sqlite3', 'packages/create/stubs/database.sqlite3.txt')
fs.copySync('packages/api/database.sqlite3', 'packages/dev/stubs/database.sqlite3.txt')

await new Spawn({
  command: 'npm run build -w create-pruvious',
  showOutput: true,
  outputPrefix: `${pc.red('CR1')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Build @pruvious/zip
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w @pruvious/zip',
  showOutput: true,
  outputPrefix: `${pc.blue('ZIP')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Build @pruject/dev
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w @pruject/dev',
  showOutput: true,
  outputPrefix: `${pc.cyan('PRJ')} ${pc.dim('|')}`,
})
  .run()
  .expectOutput(/BIN.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Build create-pruject
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build -w create-pruject',
  showOutput: true,
  outputPrefix: `${pc.red('CR2')} ${pc.dim('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Build @pruvious/dev
|--------------------------------------------------------------------------
|
*/

fs.copySync('packages/shared/src/types.ts', 'packages/dev/stubs/types.ts.txt')

await new Spawn({
  command: 'npm run build -w @pruvious/dev',
  showOutput: true,
  outputPrefix: `${pc.magenta('DEV')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Copy CMS builds to /dist
|--------------------------------------------------------------------------
|
*/

fs.copySync('packages/api/build', 'dist/cms')
fs.copySync('packages/app/dist/app', 'dist/cms/public')
fs.renameSync('dist/cms/public/index.html', 'dist/cms/public/.index.html')

/*
|--------------------------------------------------------------------------
| Set up .env
|--------------------------------------------------------------------------
|
*/

fs.writeFileSync(
  'dist/cms/.env.example',
  fs
    .readFileSync('packages/api/.env.example', 'utf-8')
    .replace('PORT=3333', 'PORT=2999')
    .replace('CMS_BASE_URL=http://localhost:3333', 'CMS_BASE_URL=http://localhost:2999'),
)
fs.copySync('dist/cms/.env.example', 'dist/cms/.env')

/*
|--------------------------------------------------------------------------
| Set up package.json
|--------------------------------------------------------------------------
|
*/

fs.writeJsonSync(
  'dist/cms/package.json',
  { name: '@pruvious/cms', ...fs.readJsonSync('dist/cms/package.json') },
  { spaces: 2 },
)

/*
|--------------------------------------------------------------------------
| Other exports
|--------------------------------------------------------------------------
|
*/

fs.copySync('packages/api/index.js', 'dist/cms/index.js')
fs.copySync('packages/api/migrate.js', 'dist/cms/migrate.js')
fs.copySync('packages/api/types.d.ts', 'dist/cms/types.d.ts')
fs.copySync('packages/api/base-settings/seo.js', 'dist/cms/base-settings/seo.js')

/*
|--------------------------------------------------------------------------
| README
|--------------------------------------------------------------------------
|
*/

fs.copySync('README.md', 'dist/cms/README.md')

/*
|--------------------------------------------------------------------------
| License
|--------------------------------------------------------------------------
|
*/

fs.copySync('LICENSE', 'dist/cms/LICENSE')
fs.copySync('LICENSE', 'packages/build/LICENSE')
fs.copySync('LICENSE', 'packages/create/LICENSE')
fs.copySync('LICENSE', 'packages/create-pruject/LICENSE')
fs.copySync('LICENSE', 'packages/dev/LICENSE')
fs.copySync('LICENSE', 'packages/nuxt/LICENSE')
fs.copySync('LICENSE', 'packages/pruject/LICENSE')
fs.copySync('LICENSE', 'packages/shared/LICENSE')
fs.copySync('LICENSE', 'packages/utils/LICENSE')
fs.copySync('LICENSE', 'packages/zip/LICENSE')

/*
|--------------------------------------------------------------------------
| Finalize
|--------------------------------------------------------------------------
|
*/

const time = Math.round(performance.now() - start)
const prefix = `${pc.bold('ALL')} ${pc.gray('|')}`

console.log(prefix)
console.log(`${prefix} All builds completed in ${prettyMs(time)}.`)
console.log(prefix)
