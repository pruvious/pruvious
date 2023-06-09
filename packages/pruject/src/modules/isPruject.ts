import fs from 'fs-extra'
import path from 'path'

export function isPruject(dir: string): boolean {
  const packageJsonPath = path.resolve(dir, 'package.json')

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = fs.readJsonSync(packageJsonPath)
    return packageJson.devDependencies && packageJson.devDependencies['@pruject-test/dev']
  }

  return false
}
