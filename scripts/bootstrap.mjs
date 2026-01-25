import fs from 'node:fs'
import { resolve } from 'node:path'

const packages = ['hub', 'plugin']

for (const pkg of packages) {
  const distPath = resolve('packages', pkg, 'dist')

  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true })
  }

  fs.writeFileSync(resolve(distPath, 'index.mjs'), '')
}

console.log('Monorepo successfully initialized.')
