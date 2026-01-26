import { consola } from 'consola'
import { colorize } from 'consola/utils'
import fs from 'node:fs'
import { join, resolve } from 'node:path'

if (fs.existsSync(resolve('node_modules'))) {
  fs.rmSync(resolve('node_modules'), { recursive: true, force: true })
  consola.success(`Removed ${colorize('dim', 'node_modules')} directory.`)
}

for (const dir of fs.readdirSync(resolve('packages'))) {
  if (fs.statSync(resolve('packages', dir)).isDirectory()) {
    const playgroundPath = resolve('packages', dir, '.playground')
    const removeDirs = [
      resolve('packages', dir, '.nuxt'),
      resolve('packages', dir, '.output'),
      resolve('packages', dir, '.pruvious'),
      resolve('packages', dir, 'dist'),
      resolve('packages', dir, 'node_modules'),
    ]

    if (fs.existsSync(playgroundPath)) {
      removeDirs.push(
        join(playgroundPath, '.nuxt'),
        join(playgroundPath, '.output'),
        join(playgroundPath, '.pruvious'),
        join(playgroundPath, 'node_modules'),
      )
    }

    for (const removeDir of removeDirs) {
      if (fs.existsSync(removeDir)) {
        fs.rmSync(removeDir, { recursive: true, force: true })
        consola.success(`Removed ${colorize('dim', removeDir.slice(resolve().length + 1))} directory.`)
      }
    }
  }
}
