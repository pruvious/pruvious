import { consola } from 'consola'
import { colorize } from 'consola/utils'
import dotenv from 'dotenv'
import { execa } from 'execa'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch } from 'ofetch'

dotenv.config({ path: '.env.test' })

const isNodeBuild = process.argv.includes('--build') || process.argv.includes('--node')
const isCloudflareBuild = process.argv.includes('--cf')
const isTest = process.argv.includes('--test')
const isDeploy = process.argv.includes('--deploy')
const isVerbose = process.argv.includes('--verbose')

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const playgroundDir = resolve(rootDir, process.env.PLAYGROUND_DIR || 'playground')
const execaPlaygroundOptions = {
  cwd: playgroundDir,
  shell: true,
  env: { npm_config_registry: process.env.PRIVATE_REGISTRY_BASE_URL },
}

// Check private registry environment variable
if (!process.env.PRIVATE_REGISTRY_BASE_URL) {
  consola.error('`PRIVATE_REGISTRY_BASE_URL` is not defined')
  process.exit(1)
}

// Check if private registry is running
await $fetch(new URL('-/ping', process.env.PRIVATE_REGISTRY_BASE_URL)).catch(() => {
  consola.error('Private registry is not running')
  process.exit(1)
})

// Publish packages
for (const dir of fs.readdirSync(resolve(rootDir, 'packages'))) {
  if (fs.lstatSync(resolve(rootDir, `packages/${dir}`)).isFile()) {
    continue
  }

  const version = JSON.parse(fs.readFileSync(resolve(rootDir, `packages/${dir}/package.json`)).toString()).version
  const handle = `${dir}@${version}`
  const published = await publish(dir)

  if (!published) {
    const unpublished = await unpublish(dir)

    if (unpublished) {
      consola.info(`Unpublished ${colorize('yellow', handle)}`)

      const retryPublished = await publish(dir)

      if (!retryPublished) {
        consola.error(`Failed to publish ${colorize('red', handle)}`)
        process.exit(1)
      }
    } else {
      consola.error(`Failed to publish ${colorize('red', handle)}`)
      process.exit(1)
    }
  }

  consola.success(`Published ${colorize('greenBright', handle)}`)
}

// Install Nuxt
await initPlayground()

// Start server
if (isTest) {
  consola.info('Running tests...')
  await execa('npx', ['vitest'], { ...execaPlaygroundOptions, stdio: 'inherit' })
} else if (isNodeBuild) {
  consola.info('Building `playground`...')
  await execa('pnpm', ['build'], { ...execaPlaygroundOptions, stdio: 'inherit' })
  consola.info('Build completed')
  consola.info('Starting server...')
  await execa('node', ['.output/server/index.mjs'], { ...execaPlaygroundOptions, stdio: 'inherit' })
} else if (isCloudflareBuild) {
  consola.info('Building `playground`...')
  await execa('pnpm', ['build'], { ...execaPlaygroundOptions, stdio: 'inherit' })
  consola.info('Build completed')
  fs.writeFileSync(
    resolve(playgroundDir, 'wrangler.toml'),
    [
      `name = "pruvious-playground"`,
      `main = ".output/server/index.mjs"`,
      `assets = { directory = ".output/public" }`,
      `workers_dev = true`,
      ...(process.env.CF_CUSTOM_DOMAIN
        ? [`routes = [`, `  { pattern = "${process.env.CF_CUSTOM_DOMAIN}", custom_domain = true }`, `]`]
        : []),
      ``,
      `compatibility_flags = [ "nodejs_compat" ]`,
      `compatibility_date = "2024-11-03"`,
      ``,
      `[[d1_databases]]`,
      `binding = "DB"`,
      `database_name = "${process.env.D1_DATABASE_NAME || 'pruvious_playground'}"`,
      `database_id = "${process.env.D1_DATABASE_ID}"`,
      ``,
      `[[d1_databases]]`,
      `binding = "LOGS"`,
      `database_name = "${process.env.D1_LOGS_DATABASE_NAME || 'pruvious_playground_logs'}"`,
      `database_id = "${process.env.D1_LOGS_DATABASE_ID}"`,
      ``,
      `[[r2_buckets]]`,
      `binding = "UPLOADS"`,
      `bucket_name = "${process.env.R2_BUCKET_NAME || 'pruvious-playground'}"`,
      ``,
      `[observability]`,
      `enabled = true`,
      ``,
      `[placement]`,
      `mode = "smart"`,
      ``,
    ].join('\n'),
  )
  consola.info('Created `wrangler.toml`')

  if (isDeploy) {
    consola.info('Deploying to Cloudflare...')
    await execa('npx', ['wrangler', 'deploy'], { ...execaPlaygroundOptions, stdio: 'inherit' })
  } else {
    consola.info('Starting server...')
    await execa('npx', ['wrangler', 'dev'], { ...execaPlaygroundOptions, stdio: 'inherit' })
  }
} else {
  consola.info('Starting development server...')
  await execa('pnpm', ['dev'], { ...execaPlaygroundOptions, stdio: 'inherit' })
}

/**
 * Publishes a package to the private registry.
 */
async function publish(dir) {
  const execaOptions = { cwd: resolve(rootDir, `packages/${dir}`), shell: true }

  try {
    await execa(
      'pnpm',
      ['publish', '--registry', process.env.PRIVATE_REGISTRY_BASE_URL, '--no-git-checks'],
      execaOptions,
    )
    return true
  } catch {
    return false
  }
}

/**
 * Unpublishes a package from the private registry.
 */
async function unpublish(dir) {
  const execaOptions = { cwd: resolve(rootDir, `packages/${dir}`), shell: true }

  try {
    await execa('pnpm', ['unpublish', '--registry', process.env.PRIVATE_REGISTRY_BASE_URL, '--force'], execaOptions)
    return true
  } catch {
    return false
  }
}

/**
 * Installs Nuxt and Pruvious.
 */
async function initPlayground() {
  if (fs.existsSync(playgroundDir)) {
    fs.rmSync(playgroundDir, { recursive: true })
  }

  fs.mkdirSync(playgroundDir)

  consola.info('Initializing `playground`...')

  await execa(
    'npx',
    [
      '--yes',
      'nuxi@latest',
      'init',
      '.',
      '--packageManager',
      'pnpm',
      '--gitInit',
      'false',
      '--preferOffline',
      '--force',
    ],
    execaPlaygroundOptions,
  )

  fs.writeFileSync(resolve(playgroundDir, '.npmrc'), `registry=${process.env.PRIVATE_REGISTRY_BASE_URL}\n`)

  consola.success('Initialization completed')

  consola.info('Installing dependencies...')

  await execa('pnpm', ['store', 'prune'], execaPlaygroundOptions)
  await execa('pnpm', ['--ignore-workspace', 'i'], execaPlaygroundOptions)
  await execa('pnpm', ['add', 'pruvious@4'], execaPlaygroundOptions)
  await execa('pnpm', ['add', '-D', '@nuxt/test-utils', 'vitest'], execaPlaygroundOptions)

  fs.writeFileSync(
    resolve(playgroundDir, 'nuxt.config.ts'),
    fs.readFileSync(resolve(playgroundDir, 'nuxt.config.ts'), 'utf-8').trim().slice(0, -3) +
      `,\n  extends: ['pruvious'],` +
      (isCloudflareBuild
        ? [
            ``,
            `  pruvious: {`,
            `    database: { driver: 'd1://DB' },`,
            `    uploads: { driver: 'r2://UPLOADS' },`,
            `    i18n: {`,
            `      languages: [`,
            `        { code: 'en', name: 'English' },`,
            `        { code: 'de', name: 'German' },`,
            `        { code: 'bs', name: 'Bosnian' },`,
            `      ],`,
            `    },`,
            `    debug: {`,
            ...(isVerbose ? [`      verbose: true,`] : []),
            `      logs: {`,
            `        driver: 'd1://LOGS',`,
            `      },`,
            `    },`,
            `  },`,
            `  nitro: { preset: 'cloudflare_module' },`,
          ].join('\n')
        : [
            ``,
            `  pruvious: {`,
            `    i18n: {`,
            `      languages: [`,
            `        { code: 'en', name: 'English' },`,
            `        { code: 'de', name: 'German' },`,
            `        { code: 'bs', name: 'Bosnian' },`,
            `      ],`,
            `    },`,
            `    debug: {`,
            ...(isVerbose ? [`      verbose: true,`] : []),
            `      logs: {`,
            `        driver: 'sqlite://logs.sqlite',`,
            `        api: { exposeRequestData: true, exposeResponseData: true },`,
            `      },`,
            `    },`,
            `  },`,
          ].join('\n')) +
      `\n})\n`,
  )

  fs.rmSync(resolve(playgroundDir, 'app.vue'))

  for (const path of [
    'actions',
    'assets',
    'components',
    'filters',
    'hooks',
    'pages',
    'server/api',
    'server/collections',
    'server/fields',
    'server/translations',
    'test',
  ]) {
    if (fs.existsSync(resolve(rootDir, 'packages/pruvious/.playground', path))) {
      fs.cpSync(resolve(rootDir, 'packages/pruvious/.playground', path), resolve(playgroundDir, path), {
        recursive: true,
      })
    }
  }

  consola.success('Installation and configuration completed')
}
