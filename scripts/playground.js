import { pc, Spawn } from '@pruvious-test/build'
import fs from 'fs-extra'

process.env.PRUVIOUS_PLAYGROUND = '1'

/*
|--------------------------------------------------------------------------
| Build
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run build',
  showOutput: true,
})
  .run()
  .expectOutput(/All builds completed in [0-9]+/)

/*
|--------------------------------------------------------------------------
| Create /tmp Pruvious CMS project
|--------------------------------------------------------------------------
|
*/

fs.emptyDirSync('tmp')

await new Spawn({
  command: 'npm init pruvious-test tmp',
  showOutput: true,
  outputPrefix: `${pc.red('CRT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/npm run dev/)

/*
|--------------------------------------------------------------------------
| Override /tmp project with local dependencies
|--------------------------------------------------------------------------
|
*/

const packageJson = fs.readJsonSync('tmp/package.json')

packageJson.dependencies['@pruvious-test/cms'] = '../dist/cms'
packageJson.devDependencies['@pruvious-test/dev'] = '../packages/dev'

fs.writeJsonSync('tmp/package.json', packageJson, { spaces: 2 })

console.log(`${pc.red('CRT')} ${pc.gray('|')} Installing dependencies...`)

await new Spawn({
  command: 'npm i',
  cwd: 'tmp',
  showOutput: true,
  outputPrefix: `${pc.red('CRT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/added [0-9]+ packages/)

/*
|--------------------------------------------------------------------------
| Start @pruvious-test/cms server
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev',
  cwd: 'tmp',
  showOutput: true,
  outputPrefix: `${pc.cyan('CMS')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/started server on/)

/*
|--------------------------------------------------------------------------
| Start @pruvious-test/nuxt
|--------------------------------------------------------------------------
|
*/

await new Spawn({
  command: 'npm run dev:prepare -w @pruvious-test/nuxt && npm run dev -w @pruvious-test/nuxt',
  showOutput: true,
  outputPrefix: `${pc.green('NXT')} ${pc.gray('|')}`,
})
  .run()
  .expectOutput(/Nitro built in [0-9]+/)
