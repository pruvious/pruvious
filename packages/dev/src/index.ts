#!/usr/bin/env node

import watcher from '@parcel/watcher'
import { pc, Script, Spawn } from '@pruvious/build'
import {
  camelize,
  debounceParallel,
  randomString,
  slugify,
  uppercaseFirstLetter,
} from '@pruvious/utils'
import args from 'args'
import detectPort from 'detect-port'
import fs from 'fs-extra'
import { globSync } from 'glob'
import kill from 'kill-port'
import path from 'path'
import terminate from 'terminate'

const pathPrefix =
  process.argv.find((arg) => arg.startsWith('--path-prefix='))?.replace('--path-prefix=', '') ?? ''

let command: string[] = []

args
  .command(
    'start',
    'Start the CMS server in production mode',
    (name: any) => {
      command = name
    },
    ['s'],
  )
  .command(
    'build',
    'Build and optimize the application for production',
    (name: any) => {
      command = name
    },
    ['b'],
  )
  .command(
    'dev',
    'Start the CMS server in development mode',
    (name: any) => {
      command = name
    },
    ['d'],
  )
  .command(
    'generate',
    [
      'Create an [a]ction, [b]lock, [c]ollection, [s]ettings group, or [v]alidator',
      pc.gray('Example 1: pruvious g a action-name'),
      pc.gray('Example 2: pruvious g b BlockName'),
      pc.gray('Example 3: pruvious g c collection-name'),
      pc.gray('Example 4: pruvious g s settings-group-name'),
      pc.gray('Example 5: pruvious g v validatorName'),
    ].join('\n                 '),
    (name: any, sub) => {
      command = name
      command.push(...sub)
    },
    ['g'],
  )

args.parse(process.argv, { name: 'pruvious' } as any)

if (command[0] === 'start') {
  new Spawn({ command: 'npm start', cwd: process.cwd(), showOutput: true }).run()
} else if (command[0] === 'build') {
  build()
} else if (command[0] === 'dev') {
  watch()
} else if (command[0] === 'generate') {
  if (command[2] === 'action' || command[2] === 'a') {
    const actionName = command.slice(3).join(' ')

    if (!actionName) {
      logError('Missing action name.', 'bottom')
      args.showHelp()
    } else {
      generateAction(slugify(actionName))
    }
  } else if (command[2] === 'block' || command[2] === 'b') {
    const blockName = command.slice(3).join(' ')

    if (!blockName) {
      logError('Missing block name.', 'bottom')
      args.showHelp()
    } else {
      generateBlock(uppercaseFirstLetter(camelize(blockName)))
    }
  } else if (command[2] === 'collection' || command[2] === 'c') {
    const collectionName = command.slice(3).join(' ')

    if (!collectionName) {
      logError('Missing collection name.', 'bottom')
      args.showHelp()
    } else {
      generateCollection(slugify(collectionName))
    }
  } else if (command[2] === 'settings' || command[2] === 's') {
    const settingsGroup = command.slice(3).join(' ')

    if (!settingsGroup) {
      logError('Missing settings group name.', 'bottom')
      args.showHelp()
    } else {
      generateSetting(slugify(settingsGroup))
    }
  } else if (command[2] === 'validator' || command[2] === 'v') {
    const validatorName = command.slice(3).join(' ')

    if (!validatorName) {
      logError('Missing validator name.', 'bottom')
      args.showHelp()
    } else {
      generateValidator(camelize(validatorName))
    }
  } else {
    logError('Missing generate option.', 'bottom')
    args.showHelp()
  }
} else {
  logError('Invalid command input.', 'bottom')
  args.showHelp()
}

let spawn: Spawn | undefined
let port: number

export async function build(): Promise<void> {
  emptyDist()
  await buildAllFiles(true)

  console.log('')
  console.log('To start the server in production mode, run', pc.cyan('npm start'))
  console.log('')
}

export async function buildAllFiles(showLogs: boolean = false): Promise<void> {
  const files = globSync('**/*.ts', {
    ignore: ['.output/**', '.types/**', 'node_modules/**'],
  })
  await Promise.all(files.map((file) => buildFile(path.resolve(process.cwd(), file), showLogs)))
}

export async function buildFile(input: string, showLogs: boolean = false): Promise<void> {
  if (fs.existsSync(input)) {
    const relativePath = path.dirname(path.relative(process.cwd(), input))
    const output = path.resolve('.output', relativePath).replaceAll('\\', '/')

    return new Promise((resolve) => {
      new Script({
        input,
        minify: false,
        external: ['*'],
        output,
        outdir: true,
        platform: 'node',
        declarations: false,
        showStartMessage: false,
        showEndMessage: showLogs,
        showTimestamps: false,
      })
        .build()
        .complete$.subscribe(() => resolve())
    })
  }
}

export function emptyDist(): void {
  const dist = path.resolve(process.cwd(), '.output')

  if (fs.existsSync(dist)) {
    fs.emptyDirSync(dist)
  }
}

export async function watch(): Promise<void> {
  emptyDist()
  await buildAllFiles()
  start()

  await spawn!.expectOutput(/started server on/)

  watcher.subscribe(
    process.cwd(),
    (_, events) => {
      // project
      events
        .map((event) => ({
          ...event,
          path: event.path.replaceAll('\\', '/'),
        }))
        .filter((event) => event.path.endsWith('.ts') && !event.path.endsWith('.d.ts'))
        .forEach((event) => {
          if (event.type === 'delete') {
            const relativePath = path.relative(process.cwd(), event.path)
            const distPath =
              path.resolve(process.cwd(), '.output', relativePath).slice(0, -2) + 'js'

            if (fs.existsSync(distPath)) {
              fs.removeSync(distPath)
            }
          } else {
            debounceParallel('w1' + event.type + event.path, () => buildFile(event.path), 250)
          }
        })

      // project/.output
      events
        .map((event) => ({
          ...event,
          path: event.path.replaceAll('\\', '/'),
        }))
        .filter(
          (event) =>
            event.path.endsWith('.env') ||
            event.path.endsWith('.output/pruvious.config.js') ||
            event.path.match(/\.output\/.+\.js$/) ||
            event.path.match(/icons\/[^\/]+\.svg$/),
        )
        .forEach((event, i) => {
          debounceParallel(
            'w2' + event.type + event.path,
            () => {
              if (i === 0) {
                console.log('')
              }

              console.log(pc.cyan(event.type), event.path)
            },
            250,
          )

          restart()
        })
    },
    { ignore: ['node_modules'] },
  )
}

function start(): void {
  ensureOutDir()
  ensureDotEnv()
  ensureDatabase()
  ensurePruviousConfig()

  if (!spawn) {
    spawn = new Spawn({
      command: 'npm start',
      cwd: process.cwd(),
      env: { NODE_ENV: 'development' },
      showOutput: true,
    }).run()

    port = getServerPort()
  }
}

function restart(): void {
  debounceParallel(
    'server',
    () => {
      if (spawn && spawn.process.pid) {
        logInfo('Restarting server...', 'top')

        terminate(spawn.process.pid, () => {
          detectPort(port).then((freePort: number) => {
            if (port === freePort) {
              start()
            } else {
              kill(port).then(() => start())
            }
          })
        })

        spawn = undefined
      }
    },
    250,
  )
}

function ensureOutDir(): void {
  const dir = path.resolve(process.cwd(), '.output')

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

function ensureDotEnv(): void {
  const env = path.resolve(process.cwd(), '.env')

  if (!fs.existsSync(env)) {
    const dotEnvStub = fs.readFileSync(path.resolve(__dirname, '../stubs/.env.txt'), 'utf-8')
    fs.writeFileSync(env, dotEnvStub.replace('{APP_KEY}', randomString(32)))
  }
}

function ensureDatabase(): void {
  if (getDbConnection() === 'sqlite') {
    const sqliteDbPath = path.resolve(process.cwd(), 'database.sqlite3')

    if (!fs.existsSync(sqliteDbPath)) {
      fs.copyFileSync(path.resolve(__dirname, '../stubs/database.sqlite3.txt'), sqliteDbPath)
    }
  }
}

function ensurePruviousConfig(): void {
  const jsPath = path.resolve(process.cwd(), '.output/pruvious.config.js')

  if (!fs.existsSync(jsPath)) {
    fs.copyFileSync(path.resolve(__dirname, '../stubs/pruvious.config.js.txt'), jsPath)
  }

  const tsPath = path.resolve(process.cwd(), 'pruvious.config.ts')

  if (!fs.existsSync(tsPath)) {
    fs.copyFileSync(path.resolve(__dirname, '../stubs/pruvious.config.ts.txt'), tsPath)
  }
}

function getServerPort(): number {
  const env = path.resolve(process.cwd(), '.env')

  if (fs.existsSync(env)) {
    const match = fs.readFileSync(env, 'utf-8').match(/PORT\s*=\s*([0-9]+)/)
    return match ? +match[1] : 2999
  }

  return 2999
}

function getDbConnection(): 'pg' | 'sqlite' {
  const env = path.resolve(process.cwd(), '.env')

  if (fs.existsSync(env)) {
    const match = fs.readFileSync(env, 'utf-8').match(/DB_CONNECTION\s*=\s*(pg|sqlite)/)
    return match ? (match[1] as any) : 'sqlite'
  }

  return 'sqlite'
}

function generateAction(actionName: string): void {
  const actionPath = path.resolve(process.cwd(), `./actions/${actionName}.ts`)
  const templatePath = path.resolve(__dirname, '../stubs/action.ts.txt')

  if (fs.existsSync(actionPath)) {
    logError(
      `A file with the name **${actionName}.ts** already exists in the **${pathPrefix}actions** folder.`,
      'bottom',
    )
  } else {
    ensureDir('actions')

    fs.writeFileSync(
      actionPath,
      fs.readFileSync(templatePath, 'utf-8').replace('action-name', actionName),
    )

    logSuccess(
      `Action **${actionName}** successfully created in **${pathPrefix}actions/${actionName}.ts**`,
      'bottom',
    )
  }
}

function generateBlock(blockName: string): void {
  const blockPath = path.resolve(process.cwd(), `./blocks/${blockName}.ts`)
  const templatePath = path.resolve(__dirname, '../stubs/Block.ts.txt')

  if (fs.existsSync(blockPath)) {
    logError(
      `A file with the name **${blockName}.ts** already exists in the **${pathPrefix}blocks** folder.`,
      'bottom',
    )
  } else {
    ensureDir('blocks')

    fs.writeFileSync(
      blockPath,
      fs.readFileSync(templatePath, 'utf-8').replace('BlockName', blockName),
    )

    logSuccess(
      `Block **${blockName}** successfully created in **${pathPrefix}blocks/${blockName}.ts**`,
      'bottom',
    )
  }
}

function generateCollection(collectionName: string): void {
  const collectionPath = path.resolve(process.cwd(), `./collections/${collectionName}.ts`)
  const templatePath = path.resolve(__dirname, '../stubs/collection.ts.txt')

  if (fs.existsSync(collectionPath)) {
    logError(
      `A file with the name **${collectionName}.ts** already exists in the **${pathPrefix}collections** folder.`,
      'bottom',
    )
  } else {
    ensureDir('collections')

    fs.writeFileSync(
      collectionPath,
      fs.readFileSync(templatePath, 'utf-8').replace('collection-name', collectionName),
    )

    logSuccess(
      `Collection **${collectionName}** successfully created in **${pathPrefix}collections/${collectionName}.ts**`,
      'bottom',
    )
  }
}

function generateSetting(settingsGroup: string): void {
  const blockPath = path.resolve(process.cwd(), `./settings/${settingsGroup}.ts`)
  const templatePath = path.resolve(__dirname, '../stubs/setting.ts.txt')

  if (fs.existsSync(blockPath)) {
    logError(
      `A file with the name **${settingsGroup}.ts** already exists in the **${pathPrefix}settings** folder.`,
      'bottom',
    )
  } else {
    ensureDir('settings')

    fs.writeFileSync(
      blockPath,
      fs.readFileSync(templatePath, 'utf-8').replace('settings-group-name', settingsGroup),
    )

    logSuccess(
      `Settings group **${settingsGroup}** successfully created in **${pathPrefix}settings/${settingsGroup}.ts**`,
      'bottom',
    )
  }
}

function generateValidator(validatorName: string): void {
  const blockPath = path.resolve(process.cwd(), `./validators/${validatorName}.ts`)
  const templatePath = path.resolve(__dirname, '../stubs/validator.ts.txt')

  if (fs.existsSync(blockPath)) {
    logError(
      `A file with the name **${validatorName}.ts** already exists in the **${pathPrefix}validators** folder.`,
      'bottom',
    )
  } else {
    ensureDir('validators')

    fs.writeFileSync(
      blockPath,
      fs.readFileSync(templatePath, 'utf-8').replace('validatorName', validatorName),
    )

    logSuccess(
      `Validator **${validatorName}** successfully created in **${pathPrefix}validators/${validatorName}.ts**`,
      'bottom',
    )
  }
}

function logInfo(message: string, emptyLine: 'top' | 'bottom' | 'both' = 'both'): void {
  if (emptyLine !== 'bottom') {
    console.log('')
  }

  console.log(pc.cyan('info'), formatMessage(message, 'cyan'))

  if (emptyLine !== 'top') {
    console.log('')
  }
}

function logSuccess(message: string, emptyLine: 'top' | 'bottom' | 'both' = 'both'): void {
  if (emptyLine !== 'bottom') {
    console.log('')
  }

  console.log(pc.green('√'), formatMessage(message, 'green'))

  if (emptyLine !== 'top') {
    console.log('')
  }
}

function logError(message: string, emptyLine: 'top' | 'bottom' | 'both' = 'both'): void {
  if (emptyLine !== 'bottom') {
    console.log('')
  }

  console.log(pc.bgRed(' ERROR '), formatMessage(message, 'red'))

  if (emptyLine !== 'top') {
    console.log('')
  }
}

function formatMessage(message: string, color: 'cyan' | 'green' | 'red'): string {
  return message
    .replace(/\*\*([^*]*(?:\*(?!\*)[^*]*)*)\*\*/g, (_, match) => {
      return color === 'red' ? pc.bold(match) : pc.cyan(match)
    })
    .replace(/\!\!([^!]*(?:\!(?!\!)[^!]*)*)\!\!/g, (_, match) => pc[color](match))
}

function ensureDir(relativePath: string): void {
  const resolvedPath = path.resolve(process.cwd(), relativePath)

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath)
  }
}
