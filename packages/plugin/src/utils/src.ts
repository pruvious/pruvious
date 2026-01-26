import { getCurrentWorkingDirectory } from '@pruvious/cli-utils'
import ignore from 'ignore'
import fs from 'node:fs'
import { dirname, join, resolve } from 'pathe'

export function getSrcFiles(srcDir: string): string[] {
  const cwd = getCurrentWorkingDirectory()
  const absoluteSrcPath = resolve(cwd, srcDir)
  const ig = ignore()
  const parentIgnores: string[] = []
  let currentLookup = absoluteSrcPath

  while (true) {
    const gitignorePath = join(currentLookup, '.gitignore')

    try {
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8')
        parentIgnores.unshift(content)
      }
    } catch {}

    const up = dirname(currentLookup)

    if (up === currentLookup) {
      break
    }

    currentLookup = up
  }

  parentIgnores.forEach((content) => ig.add(content))

  const results: string[] = []

  function crawl(
    currentDir: string,
    relativePath: string,
    isRootLevel: boolean,
    parentIgnoreInstance: ReturnType<typeof ignore>,
  ) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    const currentIgnore = ignore().add(parentIgnoreInstance)
    const localGitignore = entries.find((e) => e.name === '.gitignore' && e.isFile())

    if (localGitignore) {
      const content = fs.readFileSync(join(currentDir, '.gitignore'), 'utf-8')
      currentIgnore.add(content)
    }

    for (const entry of entries) {
      const entryName = entry.name

      if (entryName === '.gitignore' || (isRootLevel && entryName === '.playground' && entry.isDirectory())) {
        continue
      }

      const entryRelativePath = relativePath ? join(relativePath, entryName) : entryName

      if (currentIgnore.ignores(entryRelativePath)) {
        continue
      }

      const fullEntryPath = join(currentDir, entryName)

      if (entry.isDirectory()) {
        crawl(fullEntryPath, entryRelativePath, false, currentIgnore)
      } else if (entry.isFile()) {
        results.push(fullEntryPath)
      }
    }
  }

  crawl(absoluteSrcPath, '', true, ig)

  return results
}
