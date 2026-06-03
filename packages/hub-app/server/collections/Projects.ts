import { defineCollection, localPathField, nullableTextField, textAreaField, textField } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import fs from 'node:fs'
import { join } from 'pathe'
import { scopeProjectsByAccessibleTargets } from '../utils/deployScopeHook'

export default defineCollection({
  fields: {
    name: textField({
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Project name'),
      },
    }),
    path: localPathField({
      selectionType: 'directory',
      initialDirectory: '~',
      required: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Source directory'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            "Absolute path on this machine to the existing Pruvious project. Pick the project's **root directory** - the one that contains `nuxt.config.ts` and a `package.json` listing `pruvious` in its dependencies. The deployer reads source from here and runs the build inside it.",
          ),
      },
      validators: [
        (value, { context }) => {
          if (!isString(value) || !value) {
            return
          }

          const pkgPath = join(value, 'package.json')

          if (!fs.existsSync(pkgPath)) {
            throw new Error(context.__('pruvious-api', 'No package.json found in the selected directory'))
          }

          let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }

          try {
            pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
          } catch {
            throw new Error(context.__('pruvious-api', 'package.json is not valid JSON'))
          }

          const hasPruvious = !!pkg.dependencies?.pruvious || !!pkg.devDependencies?.pruvious

          if (!hasPruvious) {
            throw new Error(context.__('pruvious-api', 'The selected directory is not a Pruvious project'))
          }
        },
      ],
    }),
    buildCommand: nullableTextField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Build command'),
        placeholder: 'pnpm run build',
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Override the build command run by the deployer. Leave empty to auto-detect from the project lockfile (`pnpm-lock.yaml` → `pnpm run build`, `bun.lock` → `bun run build`, `yarn.lock` → `yarn build`, otherwise `npm run build`).',
          ),
      },
    }),
    preBuildCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Pre-build command'),
        placeholder: 'git pull --ff-only',
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed before the build for every target of this project. A non-zero exit aborts the deploy. Runs in the project directory with the same environment variables as the build.',
          ),
      },
    }),
    postBuildCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Post-build command'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed after the build, before the deploy is uploaded. A non-zero exit aborts the deploy. Runs in the project directory.',
          ),
      },
    }),
    postDeployCommand: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Post-deploy command'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Shell snippet executed after the deploy finishes, regardless of outcome. Use `$DEPLOY_STATUS` (`success` or `failed`) to branch behavior; `$DEPLOY_ERROR` carries the failure message. Failures here are logged but do not change the deployment status. Also available: `$DEPLOY_ID`, `$DEPLOY_BRANCH`, `$DEPLOY_PROJECT_NAME`, `$DEPLOY_PROJECT_PATH`, `$DEPLOY_TARGET_NAME`, `$DEPLOY_TARGET_TYPE`, `$DEPLOY_TARGET_ID`.',
          ),
      },
    }),
    description: textAreaField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Description'),
      },
    }),
  },
  hooks: {
    beforeQueryPreparation: [scopeProjectsByAccessibleTargets()],
  },
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Pruvious projects'),
    icon: 'brand-nuxt',
    menu: {
      group: 'general',
      order: 2,
    },
    indexPage: {
      dataTable: {
        columns: ['name | 240px', 'path', 'createdAt | 150px'],
        orderBy: 'name:asc',
      },
    },
  },
})
