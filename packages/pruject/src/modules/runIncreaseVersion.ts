import fs from 'fs-extra'
import inquirer from 'inquirer'
import path from 'path'
import semver from 'semver'
import { error, newLine, ok, term } from './terminal'

export async function runIncreaseVersion(sub: string[]) {
  const { packageJson } = getPackages()

  const currentVersion = packageJson.version
  const major = semver.major(currentVersion)
  const minor = semver.minor(currentVersion)
  const patch = semver.patch(currentVersion)
  const newMajor = `${major}.${minor}.${patch + 1}`
  const newMinor = `${major}.${minor + 1}.0`
  const newPatch = `${major + 1}.0.0`

  let newVersion: string = sub[0]

  if (newVersion) {
    if (semver.valid(newVersion)) {
      updateVersions(newVersion)
    } else {
      error(`Invalid version ^r${newVersion}^:.`)
      newLine(2)
      process.exit()
    }
  } else {
    term.clear()

    await new Promise<void>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'version',
            message: 'Select version',
            choices: [
              { name: `Patch (${newMajor})`, value: newMajor },
              { name: `Minor (${newMinor})`, value: newMinor },
              { name: `Major (${newPatch})`, value: newPatch },
            ],
          },
        ])
        .then(async (answers) => {
          updateVersions(answers.version)
          newVersion = answers.version
          resolve()
        })
    })
  }

  term.clear()
  ok(`Successfully updated project version to ^c${newVersion}^:.`)
  newLine(2)
}

function getPackages() {
  return {
    packageJson: fs.readJsonSync(path.resolve(process.cwd(), 'package.json')),
    packageJsonPruvious: fs.readJsonSync(
      path.resolve(process.cwd(), 'packages/pruvious/package.json'),
    ),
    packageJsonNuxt: fs.readJsonSync(path.resolve(process.cwd(), 'packages/nuxt/package.json')),
  }
}

function updateVersions(version: string) {
  const { packageJson, packageJsonPruvious, packageJsonNuxt } = getPackages()

  packageJson.version = version
  packageJsonPruvious.version = version
  packageJsonNuxt.version = version

  fs.writeJsonSync('package.json', packageJson, { spaces: 2 })
  fs.writeJsonSync('packages/pruvious/package.json', packageJsonPruvious, { spaces: 2 })
  fs.writeJsonSync('packages/nuxt/package.json', packageJsonNuxt, { spaces: 2 })
}
