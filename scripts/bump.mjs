import { consola } from 'consola'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { resolve } from 'node:path'

const dependencyBlockPattern = /"((?:dev)?[Dd]ependencies)":\s*{([^}]*)}/g
const dependencyPattern = /"([^"]+)":\s*"([^"]+)"/g
const packageVersionCache = {}
const files = [{ path: resolve('package.json'), content: fs.readFileSync(resolve('package.json'), 'utf-8') }]
const ignoreDependencies = ['ohash', 'vue-sonner']

for (const dir of fs.readdirSync(resolve('packages'))) {
  if (fs.statSync(resolve('packages', dir)).isDirectory()) {
    const packagePath = resolve('packages', dir, 'package.json')
    files.push({ path: packagePath, content: fs.readFileSync(packagePath, 'utf-8') })
  }
}

for (const { path, content } of files) {
  const allDependencies = {}

  let blockMatch

  while ((blockMatch = dependencyBlockPattern.exec(content)) !== null) {
    const blockType = blockMatch[1]
    const blockContent = blockMatch[2]

    let depMatch

    while ((depMatch = dependencyPattern.exec(blockContent)) !== null) {
      const packageName = depMatch[1]
      const version = depMatch[2]

      if (!allDependencies[blockType]) {
        allDependencies[blockType] = {}
      }

      allDependencies[blockType][packageName] = version
    }
  }

  let newContent = content

  for (const blockType in allDependencies) {
    for (const packageName in allDependencies[blockType]) {
      if (!ignoreDependencies.includes(packageName)) {
        const currentVersion = allDependencies[blockType][packageName]

        if (!currentVersion.startsWith('workspace:')) {
          const latestVersion = await getLatestVersion(packageName)

          if (latestVersion && latestVersion !== currentVersion) {
            allDependencies[blockType][packageName] = latestVersion
            consola.info(
              `Updating ${colorize('green', packageName)} from ${colorize('dim', currentVersion)} to ${colorize('green', latestVersion)} in ${colorize('dim', path)}`,
            )
            newContent = newContent.replace(
              `"${packageName}": "${currentVersion}"`,
              `"${packageName}": "${latestVersion}"`,
            )
          } else if (latestVersion === null) {
            consola.warn(
              `Could not fetch version for ${colorize('red', packageName)}. Keeping current version: ${colorize('dim', currentVersion)}`,
            )
          }
        }
      }
    }
  }

  fs.writeFileSync(path, newContent, 'utf-8')
}

async function getLatestVersion(packageName) {
  if (packageVersionCache[packageName]) {
    return packageVersionCache[packageName]
  }

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`)
    const data = await response.json()
    const version = data['dist-tags'].latest
    packageVersionCache[packageName] = version
    return version
  } catch (error) {
    consola.error(`Error fetching version for ${colorize('red', packageName)}:`, error)
    return null
  }
}
