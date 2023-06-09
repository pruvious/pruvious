import watcher from '@parcel/watcher'
import { pc, Spawn } from '@pruvious/build'
import { debounceParallel } from '@pruvious/utils'
import fs from 'fs-extra'

process.env.PRUVIOUS_DEV = '1'

/*
|--------------------------------------------------------------------------
| Ensure files
|--------------------------------------------------------------------------
|
*/

fs.ensureFileSync('packages/api/database.sqlite3')

if (!fs.existsSync('packages/api/pruvious.config.js')) {
  fs.writeFileSync(
    'packages/api/pruvious.config.js',
    `// @ts-check
  
  /** @type {import('api').ConfigFactory} */
  module.exports = async () => ({})
  `,
  )
}

/*
|--------------------------------------------------------------------------
| @pruvious/utils
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w @pruvious/utils',
  showOutput: true,
  outputPrefix: `${pc.blue('UTL')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Found 0 errors\. Watching for file changes\./)

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
| @pruvious/shared
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w @pruvious/shared',
  showOutput: true,
  outputPrefix: `${pc.dim('SRD')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|
*/

let apiSubscription

async function startAPI() {
  const spawn = new Spawn({
    command: 'npm run dev -w api',
    showOutput: true,
    outputPrefix: `${pc.blue('API')} ${pc.gray('|')}`,
  }).run()

  apiSubscription = spawn.output$.subscribe((output) => {
    if (output.text.includes('EPERM') && output.text.includes('database.sqlite3')) {
      apiSubscription.unsubscribe()
      startAPI()
    }
  })

  await spawn.expectOutput(/Watching filesystem for changes/)
}

await startAPI()

/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w app',
  showOutput: true,
  outputPrefix: `${pc.cyan('APP')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Compiled successfully/)

/*
|--------------------------------------------------------------------------
| create-pruvious
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w create-pruvious',
  showOutput: true,
  outputPrefix: `${pc.red('CR1')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| @pruject/dev
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w @pruject/dev',
  showOutput: true,
  outputPrefix: `${pc.cyan('PRJ')} ${pc.dim('|')}`,
})
  .run()
  .expectOutput(/BIN.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| create-pruject
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w create-pruject',
  showOutput: true,
  outputPrefix: `${pc.red('CR2')} ${pc.dim('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| @pruvious/dev
|--------------------------------------------------------------------------
|
*/

fs.copySync('packages/shared/src/types.ts', 'packages/dev/stubs/types.ts.txt')

await new Spawn({
  command: 'npm run dev -w @pruvious/dev',
  showOutput: true,
  outputPrefix: `${pc.magenta('DEV')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| @pruvious/zip
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev -w @pruvious/zip',
  showOutput: true,
  outputPrefix: `${pc.blue('ZIP')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/CJS.+build completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| @pruvious/nuxt
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command:
    'npm run dev:prepare -w @pruvious/nuxt && npm run dev -w @pruvious/nuxt -- --dev',
  showOutput: true,
  outputPrefix: `${pc.green('NXT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Nitro built in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Watch specific files
|--------------------------------------------------------------------------
|
*/

watcher.subscribe(
  'packages/api',
  (_, events) => {
    events.forEach((event) => {
      if (
        !event.path.endsWith('imports.ts') &&
        (event.path.includes('actions') ||
          event.path.includes('blocks') ||
          event.path.includes('collections') ||
          event.path.includes('settings') ||
          event.path.includes('validators') ||
          event.path.endsWith('pruvious.config.js'))
      ) {
        debounceParallel('restart-api', restartApi, 250)
      }
    })
  },
  { ignore: ['node_modules'] },
)

watcher.subscribe('packages/shared/src', (_, events) => {
  events.forEach((event) => {
    if (event.path.endsWith('types.ts')) {
      debounceParallel(
        'copy-dev-types',
        () => {
          fs.copySync('packages/shared/src/types.ts', 'packages/dev/stubs/types.ts.txt')
        },
        250,
      )
    }

    debounceParallel('restart-api', restartApi, 250)
  })
})

function restartApi() {
  fs.writeFileSync(
    'packages/api/app/imports.ts',
    fs.readFileSync('packages/api/app/imports.ts', 'utf-8'),
  )
}

restartApi()
