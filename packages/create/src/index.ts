#!/usr/bin/env node

import { randomString, slugify } from '@pruvious-test/utils'
import fs from 'fs-extra'
import path from 'path'
import pc from 'picocolors'
import prompt from 'prompt-sync'

const packageJson = fs.readJsonSync(path.resolve(__dirname, '../stubs/package.json.txt'))
const dotEnv = fs.readFileSync(path.resolve(__dirname, '../stubs/.env.txt'), 'utf-8')

let dirName: string = ''
let prompted: boolean = false

if (process.argv.length < 3) {
  const ask = prompt({ sigint: true })
  let i: number = 0

  while (!dirName.trim()) {
    console.clear()

    if (i) {
      console.log(pc.bgRed(' ERROR '), 'This input is required.')
      console.log('')
    }

    dirName = ask('Enter a directory name or path where you would like to install the app: ')
    i++
  }

  console.clear()
  prompted = true
} else {
  dirName = process.argv[process.argv.length - 1]
}

const dirPath = path.resolve(process.cwd(), dirName)
const relativePath = path.relative(process.cwd(), dirPath)

fs.ensureDirSync(dirPath)

if (fs.readdirSync(dirPath).length) {
  if (!prompted) {
    console.log('')
  }

  console.log(pc.bgRed(' ERROR '), 'The target directory must be empty.')
  console.log('')
  process.exit()
}

packageJson['name'] = slugify(
  dirPath
    .replace(/[\/\\]*$/, '')
    .split(/[\/\\]/)
    .pop()!,
)

fs.writeJsonSync(`${dirPath}/package.json`, packageJson, { spaces: 2 })

fs.writeFileSync(`${dirPath}/.env`, dotEnv.replace('{APP_KEY}', randomString(32)))

fs.copySync(path.resolve(__dirname, '../stubs/.gitignore.txt'), `${dirPath}/.gitignore`)
fs.copySync(path.resolve(__dirname, '../stubs/database.sqlite3.txt'), `${dirPath}/database.sqlite3`)
fs.copySync(path.resolve(__dirname, '../stubs/tsconfig.json.txt'), `${dirPath}/tsconfig.json`)

fs.copySync(
  path.resolve(__dirname, '../stubs/pruvious.config.ts.txt'),
  `${dirPath}/pruvious.config.ts`,
)

fs.ensureDirSync(`${dirPath}/actions`)
fs.ensureDirSync(`${dirPath}/blocks`)
fs.ensureDirSync(`${dirPath}/collections`)
fs.ensureDirSync(`${dirPath}/icons`)
fs.ensureDirSync(`${dirPath}/settings`)
fs.ensureDirSync(`${dirPath}/uploads`)
fs.ensureDirSync(`${dirPath}/validators`)

if (!prompted) {
  console.log('')
}

console.log('The Pruvious project was successfully created. Next steps:')

if (relativePath) {
  console.log(
    ' › ' + pc.cyan('cd ' + (relativePath.includes(' ') ? `"${relativePath}"` : relativePath)),
  )
}

console.log(
  ` › Install dependencies with ${pc.cyan('npm install')} or ${pc.cyan(
    'yarn install',
  )} or ${pc.cyan('pnpm install')}`,
)

console.log(
  ` › Start development server with ${pc.cyan('npm run dev')} or ${pc.cyan(
    'yarn dev',
  )} or ${pc.cyan('pnpm run dev')}`,
)

console.log('')
