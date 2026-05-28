import { consola } from 'consola'
import { colorize } from 'consola/utils'
import { execa } from 'execa'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Prepares a prerelease (alpha by default) of the Pruvious v4 packages.
 *
 * Publishing itself happens in CI: pushing the git tag created here triggers the
 * `release` workflow, which builds and publishes the packages to npm. This script
 * only does the local, reversible work - bumping versions and (optionally)
 * creating the commit and tag.
 *
 * The packages do not share a single version. Most get an independent prerelease
 * bump, while `create-pruvious` mirrors the `pruvious` version (the scaffolder is
 * meant to track the framework it installs). The git tag is named after the
 * `pruvious` version and the CI workflow derives the npm dist-tag from it.
 *
 * Usage:
 *
 *   pnpm release -- --alpha              # bump versions only, then review
 *   pnpm release -- --alpha --git-tag    # bump, commit, and create the tag
 *   pnpm release -- --preid beta         # cut a beta instead
 *   pnpm release -- --alpha --no-bump --git-tag  # tag the current versions
 *
 * After running with --git-tag, push the tag to publish:
 *
 *   git push origin HEAD --follow-tags
 */

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Packages that receive an independent prerelease bump.
const prereleasePackages = [
  '@pruvious/utils',
  '@pruvious/i18n',
  '@pruvious/orm',
  '@pruvious/storage',
  '@pruvious/ui',
  '@pruvious/cli-utils',
  'pruvious',
]

// Packages whose version mirrors `pruvious`.
const mirrorPruviousPackages = ['create-pruvious']

const args = parseArgs(process.argv.slice(2))
const preid = args.preid ?? 'alpha'

const packages = collectPackages()

for (const name of [...prereleasePackages, ...mirrorPruviousPackages, 'pruvious']) {
  if (!packages[name]) {
    consola.error(`Package ${colorize('red', name)} not found in the workspace.`)
    process.exit(1)
  }
}

// 1. Compute the full version plan first (and validate every version parses)
// so we never write a partially-bumped set of package.json files.
const plan = []

if (!args.noBump) {
  for (const name of prereleasePackages) {
    plan.push({ name, current: packages[name].version, next: bumpPrerelease(packages[name].version, preid) })
  }

  const pruviousNext = plan.find((item) => item.name === 'pruvious').next

  for (const name of mirrorPruviousPackages) {
    plan.push({ name, current: packages[name].version, next: pruviousNext, mirror: true })
  }
}

// The git tag is named after the (planned) pruvious version.
const pruviousVersion = args.noBump ? packages['pruvious'].version : plan.find((item) => item.name === 'pruvious').next
const tag = `v${pruviousVersion}`

// 2. Fail early - before writing or committing anything - if the tag exists.
if (args.gitTag) {
  const existing = await execa('git', ['tag', '--list', tag], { cwd: rootDir })

  if (existing.stdout.trim() === tag) {
    consola.error(`Git tag ${colorize('red', tag)} already exists. Delete it or bump again before releasing.`)
    process.exit(1)
  }
}

// 3. Apply the version bumps.
if (!args.noBump) {
  consola.info(`Bumping versions (prerelease id: ${colorize('cyan', preid)})`)

  for (const item of plan) {
    setVersion(packages[item.name], item.next)
    packages[item.name].version = item.next
    const suffix = item.mirror ? ' (mirrors pruvious)' : ''
    consola.log(
      `  ${item.name.padEnd(22)} ${colorize('gray', item.current)} -> ${colorize('green', item.next)}${suffix}`,
    )
  }
} else {
  consola.info('Skipping version bump (--no-bump)')
}

// 4. Optionally create the release commit and tag. With --no-bump there is
// nothing to commit, so we only tag the current HEAD.
if (args.gitTag) {
  if (!args.noBump) {
    const changed = [...prereleasePackages, ...mirrorPruviousPackages].map((name) => packages[name].path)
    consola.info(`Creating release commit ${colorize('cyan', `release: ${tag}`)}`)
    await execa('git', ['add', ...changed], { cwd: rootDir, stdio: 'inherit' })
    await execa('git', ['commit', '-m', `release: ${tag}`], { cwd: rootDir, stdio: 'inherit' })
  }

  // Annotated tag (not lightweight) so `git push --follow-tags` actually pushes it.
  consola.info(`Creating git tag ${colorize('cyan', tag)}`)
  await execa('git', ['tag', '-a', tag, '-m', `release ${tag}`], { cwd: rootDir, stdio: 'inherit' })
}

consola.box(
  [
    args.gitTag ? `Prepared and tagged ${colorize('green', tag)}.` : `Bumped versions for ${colorize('green', tag)}.`,
    '',
    'Next steps:',
    args.gitTag
      ? `  Push to publish via CI:  ${colorize('cyan', 'git push origin HEAD --follow-tags')}`
      : `  Review, then commit and tag:  ${colorize('cyan', `git commit -am "release: ${tag}" && git tag ${tag}`)}`,
    `  CI publishes on the pushed tag and the packages land under the ${colorize('cyan', preid)} dist-tag.`,
  ].join('\n'),
)

/**
 * Reads every workspace package and returns a map keyed by package name.
 */
function collectPackages() {
  const result = {}

  for (const entry of fs.readdirSync(resolve(rootDir, 'packages'))) {
    const dir = resolve(rootDir, 'packages', entry)

    if (!fs.statSync(dir).isDirectory()) {
      continue
    }

    const path = resolve(dir, 'package.json')

    if (!fs.existsSync(path)) {
      continue
    }

    const json = JSON.parse(fs.readFileSync(path, 'utf-8'))
    result[json.name] = { dir, path, version: json.version }
  }

  return result
}

/**
 * Writes a new top-level `version` into a package.json, preserving formatting.
 */
function setVersion(pkg, version) {
  const content = fs.readFileSync(pkg.path, 'utf-8')
  const next = content.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`)

  if (next === content) {
    consola.error(`Could not update the version field in ${pkg.path}`)
    process.exit(1)
  }

  fs.writeFileSync(pkg.path, next)
}

/**
 * Increments the prerelease portion of a semver version.
 * `4.0.0` -> `4.0.0-alpha.0`, `4.0.0-alpha.0` -> `4.0.0-alpha.1`.
 */
function bumpPrerelease(version, id) {
  const match = version.match(/^(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?$/)

  if (!match) {
    consola.error(`Cannot parse version: ${version}`)
    process.exit(1)
  }

  const [, core, prerelease] = match

  if (!prerelease) {
    return `${core}-${id}.0`
  }

  const parts = prerelease.split('.')
  const last = parts[parts.length - 1]

  if (/^\d+$/.test(last)) {
    parts[parts.length - 1] = String(Number(last) + 1)
    return `${core}-${parts.join('.')}`
  }

  return `${core}-${prerelease}.0`
}

/**
 * Parses the supported CLI flags.
 */
function parseArgs(argv) {
  const result = { noBump: false, gitTag: false }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--alpha') {
      result.preid = 'alpha'
    } else if (arg === '--no-bump') {
      result.noBump = true
    } else if (arg === '--git-tag') {
      result.gitTag = true
    } else if (arg === '--preid') {
      result.preid = argv[++i]
    } else if (arg.startsWith('--preid=')) {
      result.preid = arg.slice('--preid='.length)
    } else {
      consola.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
  }

  return result
}
