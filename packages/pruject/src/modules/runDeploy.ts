import { Zip } from '@pruvious/zip'
import fs from 'fs-extra'
import { globSync } from 'glob'
import path from 'path'
import { getConfig } from './config'
import { runNuxtBuild } from './runNuxtBuild'
import { runPruviousBuild } from './runPruviousBuild'
import { connect, selectServer } from './servers'
import { error, loadingScreen, newLine, ok, term } from './terminal'
import { getWebsiteInfo, selectWebsite } from './websites'

export async function runDeploy(sub: string[]) {
  const server = await selectServer(sub[0])
  const ssh = await connect(server)
  const websitePartial = await selectWebsite(ssh, server, 'deploy', sub[1])
  const website = await getWebsiteInfo(ssh, websitePartial.domain!)

  if (website.id !== getConfig().id) {
    term.clear()
    error('The local and remote Project IDs do not match for the selected website.')
    newLine(2)
    process.exit()
  }

  let screen = await loadingScreen('Building ^cPruvious^ app ^-(1 of 3)^:')
  await runPruviousBuild(false)

  screen.destroy()
  term.clear()

  screen = await loadingScreen('Building ^gNuxt^ app ^-(2 of 3)^:')
  await runNuxtBuild(false)

  screen.destroy()

  screen = await loadingScreen(`Deploying ^c${website.domain}^ ^-(3 of 3)^:`)
  const timestamp = Date.now()
  const zip = new Zip({ baseName: timestamp.toString() })
  const tmpPath = path.resolve(process.cwd(), '.tmp')
  const zipPath = path.resolve(tmpPath, `${timestamp}.zip`)

  fs.ensureDir(tmpPath)

  zip.addFile(path.resolve(process.cwd(), 'package.json'))
  zip.addFile(path.resolve(process.cwd(), 'package-lock.json'))
  zip.addFile(path.resolve(process.cwd(), 'packages/pruvious/package.json'), 'packages/pruvious')
  zip.addFile(path.resolve(process.cwd(), 'packages/nuxt/package.json'), 'packages/nuxt')

  for (const file of globSync('**/*', {
    cwd: path.resolve(process.cwd(), 'packages/pruvious/.output'),
    nodir: true,
  })) {
    zip.addFile(
      path.resolve(process.cwd(), 'packages/pruvious/.output', file),
      path.join('packages/pruvious/.output', path.dirname(file)),
    )
  }

  for (const file of globSync('**/*', {
    cwd: path.resolve(process.cwd(), 'packages/nuxt/.output'),
    nodir: true,
  })) {
    zip.addFile(
      path.resolve(process.cwd(), 'packages/nuxt/.output', file),
      path.join('packages/nuxt/.output', path.dirname(file)),
    )
  }

  zip.save(tmpPath)

  await ssh.execCommand(`rm -rf ~/prujects/${website.domain}/packages/pruvious/.output`)
  await ssh.execCommand(`rm -rf ~/prujects/${website.domain}/packages/nuxt/.output`)
  await ssh.putFile(zipPath, `/home/pruject/prujects/${website.domain}/${timestamp}.zip`)
  await ssh.execCommand(
    `unzip -o ~/prujects/${website.domain}/${timestamp}.zip -d ~/prujects/${website.domain}`,
  )
  await ssh.execCommand(`rm ~/prujects/${website.domain}/${timestamp}.zip`)

  const src = 'source ~/.nvm/nvm.sh; '

  await ssh.execCommand(`${src} npm install --prefix ~/prujects/${website.domain}/`)

  await ssh.execCommand(
    `${src} pm2 stop ~/prujects/${website.domain}/packages/pruvious/ecosystem.config.js`,
  )
  await ssh.execCommand(
    `${src} pm2 stop ~/prujects/${website.domain}/packages/nuxt/ecosystem.config.js`,
  )
  await ssh.execCommand(
    `${src} pm2 start ~/prujects/${website.domain}/packages/pruvious/ecosystem.config.js`,
  )
  await ssh.execCommand(
    `${src} pm2 start ~/prujects/${website.domain}/packages/nuxt/ecosystem.config.js`,
  )
  await ssh.execCommand(`${src} pm2 save`)

  fs.removeSync(zipPath)

  screen.destroy()
  term.clear()

  ok(`Successfully deployed website ^c${website.domain}^:.`)
  newLine(2)
  term(`URL: ^chttps://${website.domain}^:`)
  newLine()
  term(`CMS: ^chttps://${website.domain}/cms^:`)
  newLine(2)
  term("If you haven't already, get your project license at https://pruvious.com/buy")
  newLine(2)
}
