import { randomString } from '@pruvious-test/utils'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import { NodeSSH } from 'node-ssh'
import path from 'path'
import { awaitEnterKey } from './awaitEnterKey'
import { ServerMeta, getConfig } from './config'
import { error, loadingScreen, newLine, term } from './terminal'

export interface WebsiteMeta {
  domain: string
  id: string
  database?: 'pg' | 'sqlite'
  disk?: 'local' | 's3'
}

interface ServerPrujectConfig {
  count: number
  email: string
}

export async function selectWebsite(
  ssh: NodeSSH,
  server: ServerMeta,
  subject: string,
  domain?: string,
  clear: boolean = true,
): Promise<Partial<WebsiteMeta>> {
  const websites = await listWebsites(ssh, server.host)

  if (domain) {
    const website = websites.find((website) => website.domain === domain)

    if (website) {
      return website
    } else {
      error(`The website ^r${domain}^ does not exist on the server.`)
      newLine(2)
      process.exit()
    }
  } else {
    if (clear) {
      term.clear()
    }

    return await new Promise<Partial<WebsiteMeta>>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'domain',
            message: `Select a website to ${subject}`,
            choices: [
              ...websites.map((website) => ({
                name: website.domain,
                value: website.domain,
              })),
              { name: '+ Add new website', value: '__add' },
            ],
          },
        ])
        .then(async (answers) => {
          term.clear()

          if (answers.domain === '__add') {
            await addWebsite(ssh, server)
            resolve(await selectWebsite(ssh, server, subject, undefined, false))
          } else {
            resolve(websites.find((website) => website.domain === answers.domain)!)
          }
        })
    })
  }
}

export async function addWebsite(ssh: NodeSSH, server: ServerMeta): Promise<WebsiteMeta> {
  const websites = await listWebsites(ssh, server.host)
  const website: WebsiteMeta = { domain: '', id: getConfig().id, database: 'sqlite' }

  term.clear()

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Domain name:',
          validate: (input) => {
            let domain: string = ''

            try {
              domain = new URL(
                input.startsWith('http:') || input.startsWith('https') ? input : `https://${input}`,
              ).hostname
            } catch (_) {
              return 'Invalid domain name'
            }

            if (!/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}$/.test(domain)) {
              return 'Invalid domain name'
            }

            if (websites.some((website) => website.domain === domain)) {
              return 'A website with the same domain already exists'
            }

            return !input.trim() ? 'This field is required' : true
          },
        },
      ])
      .then(async (answers) => {
        website.domain = new URL(
          answers.domain.startsWith('http:') || answers.domain.startsWith('https')
            ? answers.domain
            : `https://${answers.domain}`,
        ).hostname.replace(/^www\./, '')
        resolve()
      })
  })

  term.clear()

  const serverIp = await getServerIp(ssh)

  term(
    `Before proceeding, ensure that the domain ^c${website.domain}^ is pointing to ^c${serverIp}^:.`,
  )
  await awaitEnterKey()

  let domainIps: string[] = []

  do {
    domainIps = await digDomain(ssh, website.domain)

    if (
      !domainIps.includes(serverIp) &&
      !domainIps.includes('127.0.0.1') &&
      !domainIps.includes('127.0.1.1')
    ) {
      error(
        `The domain ^c${website.domain}^ currently points to ^c${domainIps[0]}^:, but it needs to point to ^c${serverIp}^:.`,
      )
      newLine(2)
      term(
        '^-Note: If you have recently made changes to your DNS records, it may take some time for those changes to take effect.^:',
      )
      await awaitEnterKey('Press ^cEnter^ to check again')
    }
  } while (
    !domainIps.includes(serverIp) &&
    !domainIps.includes('127.0.0.1') &&
    !domainIps.includes('127.0.1.1')
  )

  await addWebsiteOnServer(ssh, website)

  return website
}

export async function listWebsites(ssh: NodeSSH, host: string): Promise<Partial<WebsiteMeta>[]> {
  term.clear()

  const screen = await loadingScreen(`Fetching websites from ^c${host}^:`)
  const websites: Partial<WebsiteMeta>[] = (await ssh.execCommand('ls ~/prujects')).stdout
    .split('\n')
    .filter(Boolean)
    .map((domain) => ({ domain }))

  screen.destroy()
  term.clear()

  return websites
}

async function digDomain(ssh: NodeSSH, domain: string): Promise<string[]> {
  term.clear()

  const screen = await loadingScreen(`Checking domain ^c${domain}^:`)
  const domainIps = (await ssh.execCommand(`dig +short ${domain}`)).stdout
    .split('\n')
    .filter(Boolean)

  screen.destroy()
  term.clear()

  return domainIps
}

async function getServerIp(ssh: NodeSSH): Promise<string> {
  return (await ssh.execCommand('dig +short myip.opendns.com @resolver1.opendns.com')).stdout
}

async function addWebsiteOnServer(ssh: NodeSSH, website: WebsiteMeta): Promise<void> {
  let www: boolean = false
  let trailingSlash: boolean = false

  term.clear()

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'www',
          message: 'Use www before the domain name',
          default: false,
          choices: [
            { name: `No  - Example: https://${website.domain}`, value: false },
            { name: `Yes - Example: https://www.${website.domain}`, value: true },
          ],
        },
      ])
      .then(async (answers) => {
        www = answers.www
        resolve()
      })
  })

  term.clear()

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'trailingSlash',
          message: 'Append trailing slashes to URLs',
          default: false,
          choices: [
            { name: `No  - Example: https://${website.domain}/path`, value: false },
            { name: `Yes - Example: https://www.${website.domain}/path/`, value: true },
          ],
        },
      ])
      .then(async (answers) => {
        trailingSlash = answers.trailingSlash
        resolve()
      })
  })

  term.clear()

  let screen = await loadingScreen('Setting up ^cNginx^ ^-(1 of 3)^:')

  const serverConfig = await getServerPrujectConfig(ssh)
  const pruviousPort = (2000 + serverConfig.count).toString()
  const nuxtPort = (3000 + serverConfig.count).toString()

  let nginxSiteStub = fs.readFileSync(path.resolve(__dirname, '../stubs/nginxSite.txt'), 'utf-8')

  if (www) {
    nginxSiteStub = nginxSiteStub
      .replaceAll('https://{{ domainName }}', 'https://www.{{ domainName }}')
      .replaceAll("if ($host = 'www.{{ domainName }}')", "if ($host = '{{ domainName }}')")
  }

  if (trailingSlash) {
    nginxSiteStub = nginxSiteStub.replaceAll(
      'rewrite ^/(.*)/$ /$1 permanent;',
      'rewrite ^([^.]*[^/])$ $1/ permanent;',
    )
  }

  nginxSiteStub = nginxSiteStub
    .replaceAll('{{ domainName }}', website.domain)
    .replace('{{ pruviousPort }}', pruviousPort)
    .replace('{{ nuxtPort }}', nuxtPort)

  await ssh.execCommand(
    `echo $'server { listen 80; server_name ${website.domain}; }' | sudo tee /etc/nginx/sites-available/${website.domain}.conf > /dev/null`,
  )

  await ssh.execCommand(
    `sudo ln -s /etc/nginx/sites-available/${website.domain}.conf /etc/nginx/sites-enabled/`,
  )

  screen.destroy()
  screen = await loadingScreen('Installing ^cSSL^ certificate ^-(2 of 3)^:')

  const certbotOutput = (
    await ssh.execCommand(
      `sudo certbot certonly --non-interactive --nginx --agree-tos -m ${serverConfig.email} -d ${website.domain} -d www.${website.domain}`,
    )
  ).stderr

  if (certbotOutput.includes('error') || certbotOutput.includes('failed')) {
    term.clear()
    error('An error occurred while installing the SSL certificate.')
    newLine(2)
    await ssh.execCommand(`sudo rm /etc/nginx/sites-available/${website.domain}.conf`)
    await ssh.execCommand(`sudo rm /etc/nginx/sites-enabled/${website.domain}.conf`)
    term(certbotOutput)
    newLine(2)
    process.exit()
  }

  await ssh.execCommand(
    `echo $'${nginxSiteStub.replace(/'/g, "\\'")}' | sudo tee /etc/nginx/sites-available/${
      website.domain
    }.conf > /dev/null`,
  )

  serverConfig.count++
  await updateServerPrujectConfig(ssh, serverConfig)

  screen.destroy()
  screen = await loadingScreen('Setting up ^cpruject^ ^-(3 of 3)^:')

  await ssh.execCommand(`mkdir ~/prujects/${website.domain}`)
  await ssh.execCommand(`mkdir ~/prujects/${website.domain}/packages`)
  await ssh.execCommand(`mkdir ~/prujects/${website.domain}/packages/pruvious`)
  await ssh.execCommand(`mkdir ~/prujects/${website.domain}/packages/nuxt`)
  await ssh.execCommand(`echo $'${website.id}' > ~/prujects/${website.domain}/.pruject`)
  await ssh.execCommand('sudo nginx -s reload')

  const ecosystemPruvious = fs.readFileSync(
    path.resolve(__dirname, '../stubs/ecosystemPruvious.txt'),
    'utf-8',
  )

  const ecosystemNuxt = fs.readFileSync(
    path.resolve(__dirname, '../stubs/ecosystemNuxt.txt'),
    'utf-8',
  )

  await ssh.execCommand(
    `echo $'${ecosystemPruvious
      .replaceAll('{{ domainName }}', website.domain)
      .replace('{{ port }}', pruviousPort)
      .replace(/'/g, "\\'")}' > ~/prujects/${website.domain}/packages/pruvious/ecosystem.config.js`,
  )

  await ssh.execCommand(
    `echo $'${ecosystemNuxt
      .replaceAll('{{ domainName }}', website.domain)
      .replace('{{ port }}', nuxtPort)
      .replace(/'/g, "\\'")}' > ~/prujects/${website.domain}/packages/nuxt/ecosystem.config.js`,
  )

  let dotEnvPruvious = fs.readFileSync(
    path.resolve(process.cwd(), 'packages/pruvious/.env'),
    'utf-8',
  )

  if (dotEnvPruvious.includes('APP_KEY')) {
    dotEnvPruvious = dotEnvPruvious.replace(/APP_KEY\s*=\s*(.+)/, `APP_KEY=${randomString(32)}`)
  } else {
    dotEnvPruvious += `\nAPP_KEY=${randomString(32)}`
  }

  if (dotEnvPruvious.includes('PORT')) {
    dotEnvPruvious = dotEnvPruvious.replace(/PORT\s*=\s*([0-9]+)/, `PORT=${pruviousPort}`)
  } else {
    dotEnvPruvious += `\nPORT=${pruviousPort}`
  }

  if (dotEnvPruvious.includes('NODE_ENV')) {
    dotEnvPruvious = dotEnvPruvious.replace(/NODE_ENV\s*=\s*([0-9]+)/, 'NODE_ENV=production')
  } else {
    dotEnvPruvious += '\nNODE_ENV=production'
  }

  if (dotEnvPruvious.includes('CMS_BASE_URL')) {
    dotEnvPruvious = dotEnvPruvious.replace(
      /CMS_BASE_URL\s*=\s*(.+)/,
      `CMS_BASE_URL=https://${website.domain}/cms`,
    )
  } else {
    dotEnvPruvious += `\nCMS_BASE_URL=https://${website.domain}/cms`
  }

  if (dotEnvPruvious.includes('SITE_BASE_URL')) {
    dotEnvPruvious = dotEnvPruvious.replace(
      /SITE_BASE_URL\s*=\s*(.+)/,
      `SITE_BASE_URL=https://${website.domain}`,
    )
  } else {
    dotEnvPruvious += `\nSITE_BASE_URL=https://${website.domain}`
  }

  if (dotEnvPruvious.includes('TRAILING_SLASH')) {
    dotEnvPruvious = dotEnvPruvious.replace(
      /TRAILING_SLASH\s*=\s*(.+)/,
      `TRAILING_SLASH=${trailingSlash}`,
    )
  } else {
    dotEnvPruvious += `\nTRAILING_SLASH=${trailingSlash}`
  }

  await ssh.execCommand(
    `echo $'${dotEnvPruvious.replace(/'/g, "\\'")}' > ~/prujects/${
      website.domain
    }/packages/pruvious/.env`,
  )

  screen.destroy()
  term.clear()
}

export async function getWebsiteInfo(ssh: NodeSSH, domain: string): Promise<WebsiteMeta> {
  term.clear()

  const screen = await loadingScreen(`Reading ^c${domain}^:`)
  const website: WebsiteMeta = {
    domain,
    id: (await ssh.execCommand(`cat ~/prujects/${domain}/.pruject`)).stdout,
    database: (
      await ssh.execCommand(
        `awk '/DB_CONNECTION\s*=\s*pg/' ~/prujects/${domain}/packages/pruvious/.env`,
      )
    ).stdout
      ? 'pg'
      : 'sqlite',
    disk: (
      await ssh.execCommand(
        `awk '/DRIVE_DISK\s*=\s*s3/' ~/prujects/${domain}/packages/pruvious/.env`,
      )
    ).stdout
      ? 's3'
      : 'local',
  }

  screen.destroy()
  term.clear()

  return website
}

export async function getServerPrujectConfig(ssh: NodeSSH): Promise<ServerPrujectConfig> {
  return JSON.parse((await ssh.execCommand('cat ~/prujects.config.json')).stdout)
}

export async function updateServerPrujectConfig(
  ssh: NodeSSH,
  config: ServerPrujectConfig,
): Promise<void> {
  await ssh.execCommand(
    `echo $'${JSON.stringify(config, undefined, 2).replace(/'/g, "\\'")}' > ~/prujects.config.json`,
  )
}
