import {
  addImports,
  addImportsDir,
  addPlugin,
  addServerHandler,
  createResolver,
  defineNuxtModule,
  resolvePath,
  useLogger,
} from '@nuxt/kit'
import { pc } from '@pruvious-test/build'
import { fileURLToPath } from 'url'

const logger = useLogger('@pruvious-test/nuxt')
const version = '1.0.0'

let fs: typeof import('fs') | undefined
let path: typeof import('path') | undefined
let BlockParser: typeof import('./runtime/BlockParser').BlockParser | undefined
let blocksDir: string
let cmsDir: string | undefined
let seo: boolean

export interface PruviousModuleOptions {
  blocksDir: string
  cmsBaseUrl: string
  cmsDir: string | null
  seo: boolean
  guides:
    | false
    | {
        backgroundColor: string
        textColor: string
      }
}

export default defineNuxtModule<PruviousModuleOptions>({
  meta: {
    name: '@pruvious-test/nuxt',
    configKey: 'pruvious',
  },
  defaults: {
    blocksDir: './components/blocks',
    cmsBaseUrl: 'http://127.0.0.1:2999',
    cmsDir: null,
    seo: true,
    guides: {
      backgroundColor: 'rgba(6, 82, 221, 0.75)',
      textColor: '#fff',
    },
  },
  hooks: {
    'components:dirs': (dirs) => {
      dirs.unshift(
        { path: fileURLToPath(new URL('./runtime/components', import.meta.url)) },
        { path: blocksDir, global: true },
      )
    },
    'pages:extend': (pages) => {
      pages.push(
        {
          name: '_pruviousPreset',
          path: '/__preset',
          file: fileURLToPath(new URL('./runtime/pages/__preset.vue', import.meta.url)),
        },
        {
          name: '_fetchPage',
          path: '/:catchAll(.*)',
          file: fileURLToPath(new URL('./runtime/pages/[...slug].vue', import.meta.url)),
        },
      )
    },
    'builder:watch': async (event, path) => {
      const resolvedPath = await resolvePath(path)

      if (resolvedPath.startsWith(blocksDir)) {
        if (event === 'add' || event === 'change') {
          pushComponent(resolvedPath)
        } else if (event === 'unlink') {
          removeComponent(resolvedPath)
        }
      }
    },
  },
  setup: async (options, nuxt) => {
    const resolver = createResolver(import.meta.url)

    blocksDir = await resolvePath(options.blocksDir)
    seo = options.seo

    nuxt.options.runtimeConfig.public.pruvious = {
      cmsBaseUrl: options.cmsBaseUrl.replace(/\/+$/, ''),
      seo,
      guides: options.guides as any,
    }

    if (nuxt.options.dev) {
      fs = await import('fs')
      path = await import('path')
      BlockParser = (await import('./runtime/BlockParser')).BlockParser

      if (options.cmsDir) {
        cmsDir = fileURLToPath(new URL(`file:///${path.resolve(options.cmsDir)}`))
      }

      if (!fs.existsSync(blocksDir)) {
        fs.mkdirSync(blocksDir, { recursive: true })
      }

      if (!cmsDir) {
        logger.error(
          `You must specify the ${pc.cyan('cmsDir')} path in ${pc.cyan(
            'nuxt.config.ts',
          )} (e.g. ${pc.cyan("modules: [['@pruvious/nuxt', { cmsDir: '../pruvious' }]]")})`,
        )
      } else if (fs.existsSync(cmsDir)) {
        pushComponents(blocksDir)
        checkVersions()
        addImports([{ from: path.resolve(cmsDir, '.types/index.d.ts'), name: 'Pruvious' }])
      } else {
        cmsDir = undefined
        logger.error(`The ${pc.red('cmsDir')} path is not valid`)
      }
    }

    if (seo) {
      addServerHandler({
        route: '/robots.txt',
        handler: fileURLToPath(new URL('./runtime/middleware/__robots', import.meta.url)),
      })

      addServerHandler({
        route: '/sitemap.xml',
        handler: fileURLToPath(new URL('./runtime/middleware/__sitemap', import.meta.url)),
      })

      addServerHandler({
        route: '/sitemap.xml/:index',
        handler: fileURLToPath(new URL('./runtime/middleware/__sitemap', import.meta.url)),
      })
    }

    addPlugin(resolver.resolve('./runtime/plugins/prose'))
    addImportsDir(resolver.resolve('./runtime/composables'))
  },
})

function pushComponents(dir: string): void {
  fs!.readdirSync(dir).forEach((file) => {
    if (fs!.lstatSync(`${dir}/${file}`).isFile() && file.endsWith('.vue')) {
      pushComponent(`${dir}/${file}`)
    } else if (fs!.lstatSync(`${dir}/${file}`).isDirectory()) {
      pushComponents(`${dir}/${file}`)
    }
  })
}

function pushComponent(path: string): void {
  if (cmsDir) {
    const block = new BlockParser!(path, blocksDir, fs!.readFileSync(path, 'utf-8'))
      .parse()
      .output(cmsDir)

    if (block.hasErrors) {
      logger.log(pc.yellow('✔'), `Built ${block.outPath}`)
    } else {
      logger.success(`Built ${block.outPath}`)
    }
  }
}

function removeComponent(path: string): void {
  if (cmsDir) {
    const block = new BlockParser!(path, blocksDir).resolveOutPath(cmsDir)

    if (fs!.existsSync(block.outPath!)) {
      fs!.unlinkSync(block.outPath!)
      logger.success(`Removed ${block.outPath}`)
    }
  }
}

function checkVersions(): void {
  if (fs && fs.existsSync(`${cmsDir}/package.json`)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(`${cmsDir}/package.json`, 'utf-8'))

      for (const pkg of ['cms', 'dev']) {
        const _version = (
          packageJson.dependencies && packageJson.dependencies[`@pruvious-test/${pkg}`]
            ? packageJson.dependencies[`@pruvious-test/${pkg}`]
            : packageJson.devDependencies && packageJson.devDependencies[`@pruvious-test/${pkg}`]
            ? packageJson.devDependencies[`@pruvious-test/${pkg}`]
            : ''
        )?.replace(/[^0-9\.]/g, '')

        if (_version && _version !== version) {
          logger.warn(
            `The ${pc.yellow('@pruvious-test/' + pkg)} version ${pc.yellow(
              _version,
            )} in your Pruvious project does not match the ${pc.cyan(
              '@pruvious-test/nuxt',
            )} version ${pc.cyan(
              version,
            )}. Please update the package with the lowest version to avoid compatibility problems.`,
          )
        }
      }
    } catch (_) {}
  }
}
