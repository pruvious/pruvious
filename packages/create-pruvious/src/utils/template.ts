import fs from 'node:fs'
import { join } from 'pathe'

/**
 * npm strips leading-dot files such as `.gitignore` from published packages,
 * so the template ships them with a `_` prefix that is restored on copy.
 */
const renameMap: Record<string, string> = {
  _gitignore: '.gitignore',
}

/**
 * Recursively copies the starter template into the target directory,
 * restoring prefixed dotfiles to their real names.
 */
export function copyTemplate(templateDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true })

  for (const entry of fs.readdirSync(templateDir, { withFileTypes: true })) {
    const source = join(templateDir, entry.name)
    const target = join(targetDir, renameMap[entry.name] ?? entry.name)

    if (entry.isDirectory()) {
      copyTemplate(source, target)
    } else {
      fs.copyFileSync(source, target)
    }
  }
}

/**
 * Patches the scaffolded `package.json` with the project name, the resolved
 * Pruvious dependency specifier, and (optionally) a `packageManager` field so
 * corepack uses one consistent version for install and later commands.
 */
export function patchPackageJSON(
  targetDir: string,
  name: string,
  pruviousSpec: string,
  packageManagerSpec?: string,
): void {
  const path = join(targetDir, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(path, 'utf-8'))

  pkg.name = name
  pkg.dependencies ??= {}
  pkg.dependencies.pruvious = pruviousSpec

  if (packageManagerSpec) {
    pkg.packageManager = packageManagerSpec
  }

  fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
}

/**
 * Activates the commented-out `pruvious` block in the scaffolded
 * `nuxt.config.ts` with an `i18n.languages` entry for the chosen default
 * language, so a fresh project starts in that language and the seeded homepage
 * and route follow it.
 */
export function patchNuxtConfig(targetDir: string, language: { code: string; name: string }): void {
  const path = join(targetDir, 'nuxt.config.ts')
  const source = fs.readFileSync(path, 'utf-8')

  const block = [
    '  pruvious: {',
    '    i18n: {',
    '      // Add more entries to enable extra locales; keep `primaryLanguage` in sync with one of the codes.',
    `      languages: [{ name: '${language.name}', code: '${language.code}' }],`,
    `      primaryLanguage: '${language.code}',`,
    '    },',
    '  },',
  ].join('\n')

  fs.writeFileSync(path, source.replace('  // pruvious: {},', block))
}

/**
 * pnpm (v10+) refuses to run a dependency's build scripts unless approved, and
 * fails the whole install when any are left unaddressed. Pruvious needs
 * `better-sqlite3` and `sharp` built (they ship native binaries), so they are
 * allow-listed here; `strictDepBuilds: false` keeps the install from failing
 * over the remaining build scripts (esbuild and friends), which run fine without
 * being built. These settings live in `pnpm-workspace.yaml` because pnpm no
 * longer reads them from `package.json`.
 */
export function writePnpmWorkspace(targetDir: string): void {
  const content = [
    '# pnpm blocks dependency build scripts by default. Allow the native ones',
    '# Pruvious needs, and let the rest stay unbuilt without failing the install.',
    'strictDepBuilds: false',
    'allowBuilds:',
    '  better-sqlite3: true',
    '  sharp: true',
    '',
  ].join('\n')

  fs.writeFileSync(join(targetDir, 'pnpm-workspace.yaml'), content)
}

/**
 * Converts arbitrary input into a valid npm package name, falling back to
 * `pruvious-app` when the result would be empty.
 */
export function toPackageName(input: string): string {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-~]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return name || 'pruvious-app'
}
