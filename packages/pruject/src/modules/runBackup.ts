import { Zip } from '@pruvious/zip'
import dayjs from 'dayjs'
import fs from 'fs-extra'
import { globSync } from 'glob'
import inquirer from 'inquirer'
import path from 'path'
import { error, newLine, ok, term } from './terminal'

interface BackupMeta {
  name: string
  label: string
  description?: string
  size: number
  createdAt: number
}

const backupsDir = path.resolve(process.cwd(), '.backups')

fs.ensureDirSync(backupsDir)

export async function runBackup(sub: string[]) {
  if (sub[0] === 'create' || sub[0] === 'c') {
    await createBackupPrompt(sub)
  } else if (sub[0] === 'restore' || sub[0] === 'r') {
    await restoreBackupPrompt(sub)
  } else if (sub[0] === 'delete' || sub[0] === 'd') {
    await deleteBackupsPrompt(sub)
  } else {
    term.clear()

    const choices: { name: string; value: string }[] = [{ name: 'Create backup', value: 'create' }]

    if (listBackups().length) {
      choices.push(
        { name: 'Restore backup', value: 'restore' },
        { name: 'Delete backups', value: 'delete' },
      )
    }

    await new Promise<void>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Choose an action',
            choices,
          },
        ])
        .then(async (answers) => {
          term.clear()

          if (answers.action === 'create') {
            await createBackupPrompt()
          } else if (answers.action === 'restore') {
            await restoreBackupPrompt()
          } else if (answers.action === 'delete') {
            await deleteBackupsPrompt()
          }

          resolve()
        })
    })
  }
}

async function createBackupPrompt(sub?: string[]) {
  if (sub) {
    createBackup(sub.slice(1).join(' '))
  } else {
    term.clear()

    await new Promise<void>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Enter a short description for the backup:',
          },
        ])
        .then((answers) => {
          term.clear()
          createBackup(answers.description)
          resolve()
        })
    })
  }
}

async function restoreBackupPrompt(sub?: string[]) {
  if (sub && sub[1]) {
    restoreBackup(sub[1])
  } else {
    const choices = listBackups().map((backup) => ({
      name: backup.label,
      value: `${backup.createdAt.toString()}.zip`,
    }))

    if (choices.length) {
      term.clear()

      await new Promise<void>((resolve) => {
        inquirer
          .prompt([
            {
              type: 'list',
              name: 'name',
              message: 'Select a backup to restore',
              choices,
            },
          ])
          .then((answers) => {
            term.clear()
            restoreBackup(answers.name)
            resolve()
          })
      })
    } else {
      error('No backups found.')
      newLine(2)
    }
  }
}

async function deleteBackupsPrompt(sub?: string[]) {
  if (sub && sub.slice(1).length) {
    deleteBackups(sub.slice(1))
  } else {
    const choices = listBackups().map((backup) => ({
      name: backup.label,
      value: `${backup.createdAt.toString()}.zip`,
    }))

    if (choices.length) {
      term.clear()

      await new Promise<void>((resolve) => {
        inquirer
          .prompt([
            {
              type: 'checkbox',
              name: 'names',
              message: 'Select backups to delete',
              choices,
            },
          ])
          .then((answers) => {
            term.clear()
            deleteBackups(answers.names)
            resolve()
          })
      })
    } else {
      error('No backups found.')
      newLine(2)
    }
  }
}

function createBackup(description?: string) {
  const now = new Date()
  const createdAt = now.getTime()
  const name = `${createdAt}.zip`
  const zip = new Zip({ baseName: createdAt.toString() })
  const meta: BackupMeta = {
    name,
    label:
      `[${dayjs(now).format('YYYY-MM-DD HH:mm:ss')}] ${name}` +
      (description ? ` (${description})` : ''),
    description,
    size: 0,
    createdAt,
  }

  if (!isPostgres()) {
    const uploads = path.resolve(process.cwd(), 'packages/pruvious/uploads')
    const database = path.resolve(process.cwd(), 'packages/pruvious/database.sqlite3')

    if (fs.existsSync(uploads)) {
      for (const file of globSync('**/*', { cwd: uploads, nodir: true })) {
        zip.addFile(path.resolve(uploads, file), path.join('uploads', path.dirname(file)))
      }
    }

    if (fs.existsSync(database)) {
      zip.addFile(database)
    }

    zip.save(backupsDir)
    meta.size = fs.statSync(path.resolve(backupsDir, name)).size
    fs.writeJsonSync(path.resolve(backupsDir, `${createdAt}.json`), meta, { spaces: 2 })

    ok(`Successfully created backup file ^c${name}^:.`)
  } else {
    error('Only ^+SQLite^ database backups are currently supported.')
  }

  newLine(2)
}

function restoreBackup(name: string) {
  const resolvedName = name.endsWith('.zip') ? name : `${name}.zip`
  const backupPath = path.resolve(backupsDir, resolvedName)

  if (fs.existsSync(backupPath)) {
    if (!isPostgres()) {
      const uploads = path.resolve(process.cwd(), 'packages/pruvious/uploads')
      const database = path.resolve(process.cwd(), 'packages/pruvious/database.sqlite3')

      fs.emptyDirSync(uploads)
      fs.removeSync(database)

      Zip.extract(backupPath, path.resolve(process.cwd(), 'packages/pruvious'))

      ok(`Successfully restored backup ^c${resolvedName}^:.`)
    } else {
      error('The app must use the ^+SQLite^ database in order to restore a backup.')
    }
  } else {
    error(`Backup ^r${resolvedName}^ does not exist.`)
  }

  newLine(2)
}

function deleteBackups(names: string[]) {
  let deleted = 0

  for (const name of names.includes('*') ? listBackups().map((backup) => backup.name) : names) {
    const resolvedName = name.endsWith('.zip') ? name : `${name}.zip`
    const backupPath = path.resolve(backupsDir, resolvedName)
    const jsonPath = backupPath.slice(0, -4) + '.json'

    if (fs.existsSync(backupPath) || fs.existsSync(jsonPath)) {
      fs.removeSync(backupPath)
      fs.removeSync(jsonPath)
      deleted++
    } else {
      error(`Backup ^r${resolvedName}^ does not exist.`)
      newLine(2)
    }
  }

  if (deleted) {
    ok(`Successfully deleted ${deleted} backup${deleted === 1 ? '' : 's'}.`)
    newLine(2)
  }
}

function listBackups(): BackupMeta[] {
  return fs
    .readdirSync(backupsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => fs.readJsonSync(path.resolve(backupsDir, file)))
    .reverse()
}

export function isPostgres(): boolean {
  const env = path.resolve(process.cwd(), 'packages/pruvious/.env')
  return fs.existsSync(env) && /DB_CONNECTION\s*=\s*pg/.test(fs.readFileSync(env, 'utf-8'))
}

export function isS3(): boolean {
  const env = path.resolve(process.cwd(), 'packages/pruvious/.env')
  return fs.existsSync(env) && /DRIVE_DISK\s*=\s*s3/.test(fs.readFileSync(env, 'utf-8'))
}
