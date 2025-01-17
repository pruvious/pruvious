import { defineCommand } from 'citty'
import { consola } from 'consola'
import fs from 'fs-extra'
import type { DownloadTemplateResult } from 'giget'
import { downloadTemplate, startShell } from 'giget'
import type { PackageManagerName } from 'nypm'
import { installDependencies } from 'nypm'
import path from 'path'
import { join, relative, resolve } from 'pathe'
import {
  addDefaultLayout,
  addPruviousModuleToNuxtConfig,
  patchGitignore,
  replaceAppVue,
  replacePackageJsonDevScript,
} from './setup.js'
import { sortArgs } from './shared.js'

const DEFAULT_REGISTRY = 'https://raw.githubusercontent.com/nuxt/starter/templates/templates'
const DEFAULT_TEMPLATE_NAME = 'v3'

export default defineCommand({
  meta: {
    name: 'init',
    description: 'Initialize a fresh Nuxt project with Pruvious',
  },
  args: sortArgs({
    dir: {
      type: 'positional',
      description: 'Project directory',
      default: '',
    },
    template: {
      type: 'string',
      alias: 't',
      description: 'Template name',
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Override existing directory',
    },
    offline: {
      type: 'boolean',
      description: 'Force offline mode',
    },
    preferOffline: {
      type: 'boolean',
      description: 'Prefer offline mode',
    },
    install: {
      type: 'boolean',
      default: true,
      description: 'Skip installing dependencies',
    },
    gitInit: {
      type: 'boolean',
      description: 'Initialize git repository',
    },
    shell: {
      type: 'boolean',
      description: 'Start shell after installation in project directory',
    },
    packageManager: {
      type: 'string',
      description: 'Package manager choice (npm, pnpm)',
    },
    cwd: {
      type: 'string',
      description: 'Current working directory',
    },
    logLevel: {
      type: 'string',
      description: 'Log level',
    },
  }),
  async run(ctx) {
    const cwd = resolve(ctx.args.cwd || '.')

    // Get template name
    const templateName = ctx.args.template || DEFAULT_TEMPLATE_NAME

    if (typeof templateName !== 'string') {
      consola.error('Please specify a template!')
      process.exit(1)
    }

    // Download template
    let template: DownloadTemplateResult

    try {
      template = await downloadTemplate(templateName, {
        dir: ctx.args.dir,
        cwd,
        force: Boolean(ctx.args.force),
        offline: Boolean(ctx.args.offline),
        preferOffline: Boolean(ctx.args.preferOffline),
        registry: process.env.NUXI_INIT_REGISTRY || DEFAULT_REGISTRY,
      })

      const packageJson = fs.readJsonSync(join(template.dir, 'package.json'))

      // Specify versions of nuxt, vue and vue-router
      packageJson.dependencies ??= {}
      packageJson.dependencies.nuxt = '~3.15.2'
      packageJson.dependencies.vue = '^3.5.13'
      packageJson.dependencies['vue-router'] = '^4.5.0'

      // Add pruvious
      packageJson.dependencies.pruvious = '^3.15.0'

      // Sort
      packageJson.dependencies = Object.fromEntries(
        Object.entries(packageJson.dependencies).sort(([a], [b]) => a.localeCompare(b)),
      )

      fs.writeJsonSync(join(template.dir, 'package.json'), packageJson, { spaces: 2 })
    } catch (err) {
      if (process.env.DEBUG) {
        throw err
      }
      consola.error((err as Error).toString())
      process.exit(1)
    }

    // Resolve package manager
    const packageManagerOptions: PackageManagerName[] = ['npm', 'pnpm']
    const packageManagerArg = ctx.args.packageManager as PackageManagerName
    const selectedPackageManager = packageManagerOptions.includes(packageManagerArg)
      ? packageManagerArg
      : await consola.prompt('Which package manager would you like to use?', {
          type: 'select',
          options: packageManagerOptions,
        })

    if (typeof selectedPackageManager === 'symbol') {
      process.exit(0)
    }

    // Write `.npmrc` with `shamefully-hoist=true` for pnpm
    if (selectedPackageManager === 'pnpm') {
      fs.writeFileSync(join(template.dir, '.npmrc'), 'shamefully-hoist=true')
    }

    // Install project dependencies
    // or skip installation based on the '--no-install' flag
    if (ctx.args.install === false) {
      consola.info('Skipping install dependencies step.')
    } else {
      consola.start('Installing dependencies...')

      try {
        // Install dependencies
        await installDependencies({
          cwd: template.dir,
          packageManager: {
            name: selectedPackageManager,
            command: selectedPackageManager,
          },
        })
      } catch (err) {
        if (process.env.DEBUG) {
          throw err
        }
        consola.error((err as Error).toString())
        process.exit(1)
      }

      consola.success('Installation completed.')
    }

    if (ctx.args.gitInit === undefined) {
      ctx.args.gitInit = await consola.prompt('Initialize git repository?', {
        type: 'confirm',
      })
    }
    if (ctx.args.gitInit) {
      consola.info('Initializing git repository...\n')
      const { execaCommand } = await import('execa')
      await execaCommand(`git init ${template.dir}`, {
        stdio: 'inherit',
      }).catch((err) => {
        consola.warn(`Failed to initialize git repository: ${err}`)
      })
    }

    // Setup Pruvious
    await addPruviousModuleToNuxtConfig(template.dir)
    replaceAppVue(template.dir)
    replacePackageJsonDevScript(template.dir)
    await patchGitignore(template.dir)
    addDefaultLayout(template.dir)
    replaceReadme(template.dir)

    // Display next steps
    consola.log(
      `\n✨ Nuxt project has been created with \`Pruvious\` and the \`${template.name}\` template. Next steps:`,
    )
    const relativeTemplateDir = relative(process.cwd(), template.dir) || '.'
    const nextSteps = [
      !ctx.args.shell && relativeTemplateDir.length > 1 && `\`cd ${relativeTemplateDir}\``,
      `Start development server with \`${selectedPackageManager} run dev\``,
    ].filter(Boolean)

    for (const step of nextSteps) {
      consola.log(` › ${step}`)
    }

    if (ctx.args.shell) {
      startShell(template.dir)
    }
  },
})

export function replaceReadme(cwd?: string) {
  fs.writeFileSync(
    path.resolve(cwd ?? process.cwd(), 'README.md'),
    [
      '# Project',
      'This project was generated with [Pruvious](https://pruvious.com) CLI version 3.15.0.',
      '',
      'Documentation: [https://pruvious.com/docs](https://pruvious.com/docs)',
      '',
      '## Setup',
      '',
      'Make sure to install the dependencies:',
      '',
      '```bash',
      '# pnpm',
      'pnpm install',
      '',
      '# npm',
      'npm install',
      '```',
      '',
      '## Development server',
      '',
      'Start the development server on `http://localhost:3000`:',
      '',
      '```bash',
      '# pnpm',
      'pnpm dev',
      '',
      '# npm',
      'npm run dev',
      '```',
      '',
      '## Production',
      '',
      'Build the website for production:',
      '',
      '```bash',
      '# pnpm',
      'pnpm build',
      '',
      '# npm',
      'npm run build',
      '```',
      '',
      'Check out the [deployment documentation](https://pruvious.com/docs/deployment) for more information.',
      '',
    ].join('\n'),
  )
}
