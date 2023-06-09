import { Spawn } from '@pruvious-test/build'
import fs from 'fs-extra'
import path from 'path'
import { loadingScreen, newLine, ok, term } from './terminal'

export async function runUpdate() {
  let screen = await loadingScreen('Checking for updates ^-(1 of 2)^:')
  let version: string = ''
  let changed: boolean = false

  const npmViewVersion = new Spawn({ command: 'npm view @pruject-test/dev version' })
  const packages = ['package.json', 'packages/pruvious/package.json', 'packages/nuxt/package.json']

  npmViewVersion.output$.subscribe((output) => {
    if (output.text.match(/^[0-9\.]+$/)) {
      version = output.text
    }
  })

  await npmViewVersion.run().expectOutput(/^[0-9\.]+$/)

  for (const p of packages) {
    const packageJsonPath = path.resolve(process.cwd(), p)
    const packageJson = fs.readJsonSync(packageJsonPath)
    const updated = updatePruviousDependencies(packageJson, version)

    if (updated) {
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 })
      changed = true
    }
  }

  screen.destroy()
  term.clear()

  if (changed) {
    screen = await loadingScreen('Updating dependencies ^-(2 of 2)^:')

    await new Spawn({ command: 'npm install' }).run().expectOutput(/vulnerabilities/)

    screen.destroy()
    term.clear()

    ok('All Pruvious dependencies have been updated to their latest versions.')
  } else {
    ok('All previous dependencies are already up-to-date.')
  }

  newLine(2)
}

function updatePruviousDependencies(packageJson: Record<string, any>, version: string): boolean {
  const dependencyTypes = ['dependencies', 'devDependencies']
  let changed: boolean = false

  for (const dependencyType of dependencyTypes) {
    if (packageJson[dependencyType]) {
      for (const dependency of Object.keys(packageJson[dependencyType])) {
        if (dependency.match(/^@pruvious-test\//) || dependency.match(/^@pruject-test\//)) {
          if (packageJson[dependencyType][dependency] !== `^${version}`) {
            packageJson[dependencyType][dependency] = `^${version}`
            changed = true
          }
        }
      }
    }
  }

  return changed
}
