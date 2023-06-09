import { Zip } from '@pruvious-test/zip'
import fs from 'fs-extra'
import { globSync } from 'glob'
import inquirer from 'inquirer'
import path from 'path'
import { getConfig } from './config'
import { isPostgres, isS3 } from './runBackup'
import { connect, selectServer } from './servers'
import { error, loadingScreen, newLine, ok, term } from './terminal'
import { getWebsiteInfo, selectWebsite } from './websites'

export async function runMirror(sub: string[]) {
  let direction: 'l2s' | 's2l' = sub[0] as any

  if (direction && direction !== 'l2s' && direction !== 's2l') {
    error(`Invalid mirror direction ^r${direction}^:.`)
    newLine(2)
    process.exit()
  } else if (!direction) {
    direction = await resolveMirrorDirection()
  }

  const server = await selectServer(sub[1])
  const ssh = await connect(server)
  const websitePartial = await selectWebsite(ssh, server, 'mirror', sub[2])
  const website = await getWebsiteInfo(ssh, websitePartial.domain!)

  if (website.database === 'pg' || isPostgres()) {
    error('Unable to mirror websites that are using ^cPostgreSQL^ databases.')
    newLine(2)
    process.exit()
  } else if (website.disk === 's3' || isS3()) {
    error('Unable to mirror websites that are using ^cS3^ storage.')
    newLine(2)
    process.exit()
  } else if (website.id !== getConfig().id) {
    error('The local and remote Project IDs do not match for the selected website.')
    newLine(2)
    process.exit()
  }

  const src = 'source ~/.nvm/nvm.sh; '
  const timestamp = Date.now()
  const localUploads = path.resolve(process.cwd(), 'packages/pruvious/uploads')
  const localDatabase = path.resolve(process.cwd(), 'packages/pruvious/database.sqlite3')
  const remotePruvious = `/home/pruject/prujects/${website.domain}/packages/pruvious`
  const remoteUploads = `${remotePruvious}/uploads`
  const remoteDatabase = `${remotePruvious}/database.sqlite3`
  const tmpUploads = path.resolve(process.cwd(), `.tmp/${timestamp}.zip`)
  const tmpRemoteUploads = `${remotePruvious}/${timestamp}.zip`
  const tmpDatabase = path.resolve(process.cwd(), `.tmp/${timestamp}.sqlite3`)

  fs.ensureDirSync(path.resolve(process.cwd(), '.tmp'))

  if (direction === 'l2s') {
    const screen = await loadingScreen(`Mirroring ^clocalhost^ to ^c${website.domain}^:`)
    const zip = new Zip({ baseName: timestamp.toString() })

    if (fs.existsSync(localUploads)) {
      for (const file of globSync('**/*', { cwd: localUploads, nodir: true })) {
        zip.addFile(path.resolve(localUploads, file), path.join('uploads', path.dirname(file)))
      }
    }

    zip.save(path.resolve(process.cwd(), '.tmp'))

    await ssh.execCommand(
      `${src} pm2 stop ~/prujects/${website.domain}/packages/pruvious/ecosystem.config.js`,
    )
    await ssh.execCommand(`rm -r ${remoteUploads}`)
    await ssh.execCommand(`rm ${remoteDatabase}`)
    await ssh.putFile(localDatabase, remoteDatabase)
    await ssh.putFile(tmpUploads, tmpRemoteUploads)
    await ssh.execCommand(
      `unzip -o ${tmpRemoteUploads} -d ~/prujects/${website.domain}/packages/pruvious`,
    )
    await ssh.execCommand(`rm ${tmpRemoteUploads}`)
    await ssh.execCommand(
      `${src} pm2 start ~/prujects/${website.domain}/packages/pruvious/ecosystem.config.js`,
    )

    fs.removeSync(tmpUploads)

    screen.destroy()
    term.clear()
    ok(`Successfully mirrored ^clocalhost^ to ^c${website.domain}^:.`)
  } else {
    const screen = await loadingScreen(`Mirroring ^c${website.domain}^ to ^clocalhost^:`)

    await ssh.execCommand(`mkdir -p ${remoteUploads}`)
    await ssh.execCommand(`touch ${remoteDatabase}`)
    await ssh.execCommand(`cd ${remotePruvious}; zip -r ${timestamp}.zip uploads/`)
    await ssh.getFile(tmpUploads, tmpRemoteUploads)
    await ssh.getFile(tmpDatabase, remoteDatabase)
    await ssh.execCommand(`rm ${tmpRemoteUploads}`)

    fs.removeSync(localUploads)
    fs.removeSync(localDatabase)
    fs.moveSync(tmpDatabase, localDatabase)

    Zip.extract(tmpUploads, path.resolve(localUploads, '..'))

    fs.removeSync(tmpUploads)
    fs.removeSync(tmpDatabase)

    screen.destroy()
    term.clear()
    ok(`Successfully mirrored ^c${website.domain}^ to ^clocalhost^:.`)
  }

  newLine(2)
}

async function resolveMirrorDirection(): Promise<'l2s' | 's2l'> {
  term.clear()

  return await new Promise<'l2s' | 's2l'>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'direction',
          message: 'Select direction',
          choices: [
            { name: 'From local to server', value: 'l2s' },
            { name: 'From server to local', value: 's2l' },
          ],
        },
      ])
      .then(async (answers) => resolve(answers.direction))
  })
}
