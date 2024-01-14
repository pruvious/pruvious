import consola from 'consola'
import { execa } from 'execa'
import fs from 'fs-extra'
import semver from 'semver'

const packageJson = fs.readJsonSync('package.json')
const module = fs.readFileSync('src/module.ts', 'utf8')
const init = fs.readFileSync('src/cli/init.ts', 'utf8')
const currentVersion = packageJson.version
const currentVersionMajorMinor = semver.major(currentVersion) + '.' + semver.minor(currentVersion)
const execaOptions = { shell: true, stdout: 'inherit', stderr: 'inherit' }

const newVersion = await consola.prompt('Select version:', {
  type: 'select',
  options: [
    { label: semver.inc(currentVersion, 'patch'), value: semver.inc(currentVersion, 'patch'), hint: 'Patch' },
    { label: semver.inc(currentVersion, 'minor'), value: semver.inc(currentVersion, 'minor'), hint: 'Minor' },
    { label: semver.inc(currentVersion, 'major'), value: semver.inc(currentVersion, 'major'), hint: 'Major' },
  ],
})

if (typeof newVersion === 'symbol') {
  process.exit(0)
}

packageJson.version = newVersion
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))

const newVersionMajorMinor = semver.major(newVersion) + '.' + semver.minor(newVersion)

fs.writeFileSync(
  'src/module.ts',
  module
    .replace(`'${currentVersionMajorMinor}'`, `'${newVersionMajorMinor}'`)
    .replace(`{{ ${currentVersionMajorMinor}.x }}`, `{{ ${newVersionMajorMinor}.x }}`),
)

consola.info(`'${currentVersionMajorMinor}'`, `'${newVersionMajorMinor}'`)

fs.writeFileSync(
  'src/cli/init.ts',
  init
    .replace(
      `packageJson.dependencies.pruvious = '^${currentVersion}'`,
      `packageJson.dependencies.pruvious = '^${newVersion}'`,
    )
    .replace(`CLI version ${currentVersion}`, `CLI version ${newVersion}`),
)

await execa('pnpm format', { ...execaOptions })
await execa('pnpm build', { ...execaOptions })
await execa('pnpm pack', { ...execaOptions })
await execa('git add .', { ...execaOptions })
await execa(`git commit -m "v${newVersion}"`, { ...execaOptions })
await execa(`git tag v${newVersion}`, { ...execaOptions })
await execa('git push', { ...execaOptions })
await execa('git push --tags', { ...execaOptions })
await execa('npm publish', { ...execaOptions })
