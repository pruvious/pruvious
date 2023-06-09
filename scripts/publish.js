import { Spawn } from '@pruvious-test/build'
import { spawnSync } from 'child_process'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import semver from 'semver'

const packageJson = fs.readJsonSync('package.json')
const packageJsonApi = fs.readJsonSync('packages/api/package.json')
const packageJsonApp = fs.readJsonSync('packages/app/package.json')
const packageJsonBuild = fs.readJsonSync('packages/build/package.json')
const packageJsonCreate = fs.readJsonSync('packages/create/package.json')
const packageJsonCreateStub = fs.readJsonSync('packages/create/stubs/package.json.txt')
const packageJsonDev = fs.readJsonSync('packages/dev/package.json')
const packageJsonZip = fs.readJsonSync('packages/zip/package.json')
const packageJsonNuxt = fs.readJsonSync('packages/nuxt/package.json')
const packageJsonShared = fs.readJsonSync('packages/shared/package.json')
const packageJsonUtils = fs.readJsonSync('packages/utils/package.json')
const nuxtModule = fs.readFileSync('packages/nuxt/src/module.ts', 'utf-8')
const packageJsonPruject = fs.readJsonSync('packages/pruject/package.json', 'utf-8')
const packageJsonCreatePruject = fs.readJsonSync('packages/create-pruject/package.json', 'utf-8')
const packageJsonCreatePrujectStub1 = fs.readJsonSync(
  'packages/create-pruject/stubs/blank/package.json.txt',
)
const packageJsonCreatePrujectStub2 = fs.readJsonSync(
  'packages/create-pruject/stubs/blank/packages/pruvious/package.json.txt',
)
const packageJsonCreatePrujectStub3 = fs.readJsonSync(
  'packages/create-pruject/stubs/blank/packages/nuxt/package.json.txt',
)

const currentVersion = packageJson.version
const major = semver.major(currentVersion)
const minor = semver.minor(currentVersion)
const patch = semver.patch(currentVersion)

inquirer
  .prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Version',
      choices: [
        `Patch (${major}.${minor}.${patch + 1})`,
        `Minor (${major}.${minor + 1}.0)`,
        `Major (${major + 1}.0.0)`,
      ],
    },
  ])
  .then(async (answers) => {
    const version = answers.version.replace(/^.+\(([0-9]+\.[0-9]+\.[0-9]+)\)$/, '$1')

    packageJson.version = version
    packageJsonApi.version = version
    packageJsonApp.version = version
    packageJsonBuild.version = version
    packageJsonCreate.version = version
    packageJsonDev.version = version
    packageJsonZip.version = version
    packageJsonNuxt.version = version
    packageJsonShared.version = version
    packageJsonUtils.version = version
    packageJsonPruject.version = version
    packageJsonCreatePruject.version = version

    updatePruviousDependencies(packageJson, version)
    updatePruviousDependencies(packageJsonApi, version)
    updatePruviousDependencies(packageJsonApp, version)
    updatePruviousDependencies(packageJsonBuild, version)
    updatePruviousDependencies(packageJsonCreate, version)
    updatePruviousDependencies(packageJsonCreateStub, version)
    updatePruviousDependencies(packageJsonDev, version)
    updatePruviousDependencies(packageJsonZip, version)
    updatePruviousDependencies(packageJsonNuxt, version)
    updatePruviousDependencies(packageJsonShared, version)
    updatePruviousDependencies(packageJsonUtils, version)
    updatePruviousDependencies(packageJsonPruject, version)
    updatePruviousDependencies(packageJsonCreatePruject, version)
    updatePruviousDependencies(packageJsonCreatePrujectStub1, version)
    updatePruviousDependencies(packageJsonCreatePrujectStub2, version)
    updatePruviousDependencies(packageJsonCreatePrujectStub3, version)

    fs.writeJsonSync('package.json', packageJson, { spaces: 2 })
    fs.writeJsonSync('packages/api/package.json', packageJsonApi, { spaces: 2 })
    fs.writeJsonSync('packages/app/package.json', packageJsonApp, { spaces: 2 })
    fs.writeJsonSync('packages/build/package.json', packageJsonBuild, { spaces: 2 })
    fs.writeJsonSync('packages/create/package.json', packageJsonCreate, { spaces: 2 })
    fs.writeJsonSync('packages/create/stubs/package.json.txt', packageJsonCreateStub, { spaces: 2 })
    fs.writeJsonSync('packages/dev/package.json', packageJsonDev, { spaces: 2 })
    fs.writeJsonSync('packages/zip/package.json', packageJsonZip, { spaces: 2 })
    fs.writeJsonSync('packages/nuxt/package.json', packageJsonNuxt, { spaces: 2 })
    fs.writeJsonSync('packages/shared/package.json', packageJsonShared, { spaces: 2 })
    fs.writeJsonSync('packages/utils/package.json', packageJsonUtils, { spaces: 2 })
    fs.writeFileSync(
      'packages/nuxt/src/module.ts',
      nuxtModule.replace(
        /const version = '[0-9]+\.[0-9]+\.[0-9]+'/,
        `const version = '${version}'`,
      ),
    )
    fs.writeJsonSync('packages/pruject/package.json', packageJsonPruject, { spaces: 2 })
    fs.writeJsonSync('packages/create-pruject/package.json', packageJsonCreatePruject, {
      spaces: 2,
    })
    fs.writeJsonSync(
      'packages/create-pruject/stubs/blank/package.json.txt',
      packageJsonCreatePrujectStub1,
      { spaces: 2 },
    )
    fs.writeJsonSync(
      'packages/create-pruject/stubs/blank/packages/pruvious/package.json.txt',
      packageJsonCreatePrujectStub2,
      { spaces: 2 },
    )
    fs.writeJsonSync(
      'packages/create-pruject/stubs/blank/packages/nuxt/package.json.txt',
      packageJsonCreatePrujectStub3,
      { spaces: 2 },
    )

    console.log('Installing dependencies...')

    await new Spawn({ command: 'npm i', showOutput: true }).run().expectOutput(/ in [0-9]+/)

    await new Spawn({ command: 'npm run build', showOutput: true })
      .run()
      .expectOutput(/All builds completed in/)

    const spawnOptions = {
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    }

    spawnSync('git add .', spawnOptions)
    spawnSync(`git commit -m "${version}"`, spawnOptions)
    spawnSync('git push', spawnOptions)
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/utils' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/build' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/shared' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/create' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/dev' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/zip' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/nuxt' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/pruject' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'packages/create-pruject' })
    spawnSync('npm publish', { ...spawnOptions, cwd: 'dist/cms' })
  })

function updatePruviousDependencies(packageJson, version) {
  const dependencyTypes = ['dependencies', 'devDependencies']

  for (const dependencyType of dependencyTypes) {
    if (packageJson[dependencyType]) {
      for (const dependency of Object.keys(packageJson[dependencyType])) {
        if (dependency.match(/^@pruvious-test\//) || dependency.match(/^@pruject-test\//)) {
          packageJson[dependencyType][dependency] = `^${version}`
        }
      }
    }
  }
}
