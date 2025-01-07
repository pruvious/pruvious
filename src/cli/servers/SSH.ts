import { blue, cyan, dim } from 'colorette'
import consola from 'consola'
import dayjs from 'dayjs'
import { execa } from 'execa'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { NodeSSH } from 'node-ssh'
import path from 'path'
import pgConnectionString from 'pg-connection-string'
import tar from 'tar'
import { parse } from '../bytes.js'
import type { PruviousServer, PruviousSite } from '../config/define'
import { execaOptions } from '../default.js'
import { getProjectInfo } from '../project.js'
import { convertBytesToM, joinRouteParts, slugify } from '../shared.js'

export interface PruviousSiteBackup {
  id: number
  timestamp: number
  description: string
}

export class SSH {
  private ssh?: NodeSSH

  constructor(private config: PruviousServer, private ignoreErrors = false) {}

  async connect() {
    this.info(`Connecting to server ${cyan(this.config.name)}...`)

    this.ssh = new NodeSSH()

    await this.ssh
      .connect({
        host: this.config.host,
        port: this.config.port ?? 22,
        username: 'pruvious',
        privateKey: this.config.privateKey,
        readyTimeout: 10000,
        keepaliveInterval: 10000,
      })
      .catch((err) => {
        this.error(`Error connecting to server ${cyan(this.config.name)}`)
        this.error(err)
        consola.box(
          'Make sure you have configured your server correctly with:\n\n' +
            cyan('curl -sLo tmp.sh https://pruvious.com/ubuntu-setup.sh && bash tmp.sh && rm tmp.sh'),
        )
        process.exit(1)
      })

    this.clearLastLine().success(`Connected to server ${cyan(this.config.name)}`)
  }

  async domainPointsToServer(domain: string) {
    if (!this.isLocal()) {
      const host = await this.exec(`dig +short ${domain} @8.8.8.8`)

      if (host !== this.config.host) {
        this.error(`Domain ${domain} does not point to this server`)
        process.exit(1)
      }
    }
  }

  async addSite(site: PruviousSite, override = false) {
    if (!override && (await this.exec(`[ -d ~/sites/${site.domain} ] && echo 1 || echo 0`)) === '1') {
      const answer = await consola.prompt(
        `Site ${cyan(site.domain)} already exists on the server. Do you want to override it?`,
        { type: 'confirm', initial: false },
      )

      if (typeof answer === 'symbol') {
        process.exit(0)
      } else if (!answer) {
        return
      }
    }

    await this.exec(`mkdir -p ~/sites/${site.domain}`)
    this.success(`Created directory ${cyan(`~/sites/${site.domain}`)}`)

    const config = await this.getSitesConfig()
    const nuxtPort = 3000 + config.count

    let nginxConfig = await nginxConfigTemplate(!site.noWWW)

    if (site.forceWWW && !site.noWWW) {
      nginxConfig = nginxConfig
        .replaceAll('https://{{ domainName }}', 'https://www.{{ domainName }}')
        .replaceAll('if ($host = "www.{{ domainName }}")', 'if ($host = "{{ domainName }}")')
    }

    if (site.trailing) {
      nginxConfig = nginxConfig.replaceAll('rewrite ^/(.*)/$ /$1 permanent;', 'rewrite ^([^.]*[^/])$ $1/ permanent;')
    }

    nginxConfig = nginxConfig
      .replaceAll('{{ domainName }}', site.domain)
      .replace('{{ nuxtPort }}', nuxtPort.toString())
      .replaceAll('$', '\\$')

    await this.exec(`cat <<EOF | sudo tee /etc/nginx/sites-available/${site.domain}.conf\n${nginxConfig}EOF`)
    this.success(`Created nginx config ${cyan(`/etc/nginx/sites-available/${site.domain}.conf`)}`)

    await this.exec(
      `sudo ln -sf /etc/nginx/sites-available/${site.domain}.conf /etc/nginx/sites-enabled/${site.domain}.conf`,
    )
    this.success(`Enabled nginx config ${cyan(`/etc/nginx/sites-enabled/${site.domain}.conf`)}`)

    if (this.isLocal()) {
      await this.exec('openssl genrsa -out private.key 2048', true)
      await this.exec(`openssl req -new -key private.key -out csr.pem -subj "/CN=${site.domain}"`)
      await this.exec('openssl x509 -req -days 365 -in csr.pem -signkey private.key -out certificate.crt', true)
      await this.exec(`sudo mkdir -p /etc/letsencrypt/live/${site.domain}`)
      await this.exec(`sudo mv certificate.crt /etc/letsencrypt/live/${site.domain}/fullchain.pem`)
      await this.exec(`sudo mv private.key /etc/letsencrypt/live/${site.domain}/privkey.pem`)
      await this.exec('rm csr.pem', true)
      this.success(`Created self-signed certificate for ${cyan(site.domain)}`)
    } else {
      await this.exec(`sudo mkdir -p /etc/letsencrypt/live/${site.domain}`)

      const certCommand =
        `sudo certbot certonly --non-interactive --nginx --agree-tos -m ${config.email} -d ${site.domain}` +
        (site.noWWW ? '' : ` -d www.${site.domain}`)
      const out = await this.ssh?.execCommand(certCommand)

      if (!out?.stdout.includes('Successfully received certificate')) {
        this.error(`Error executing command: ${certCommand}`)
        this.error(out?.stderr)
        process.exit(1)
      }

      this.success(`Created certificate for ${cyan(site.domain)}`)
    }

    await this.exec(
      `cat <<EOF | sudo tee /etc/nginx/sites-available/${site.domain}.conf\n${nginxConfig.replaceAll('### ', '')}EOF`,
    )

    await this.exec('sudo nginx -s reload', /signal process started/)
    this.success('Reloaded nginx')

    const dbUser = slugify(site.domain).replace(/[\.-]/g, '_').slice(0, 63)
    const dbPassword = nanoid(64)
    const dbName = dbUser
    await this.exec(`sudo -u postgres psql -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';"`, true)
    await this.exec(
      `sudo -u postgres psql -c "ALTER USER ${dbUser} WITH PASSWORD '${dbPassword}';"`,
      /^could not change directory to /,
    )
    this.success(`Created database user ${cyan(dbUser)}`)
    await this.exec(`sudo -u postgres psql -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"`, true)
    await this.exec(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`, true)
    this.success(`Created database ${cyan(dbName)}`)

    const ecosystem = ecosystemTemplate()
      .replaceAll('{{ domainName }}', site.domain)
      .replaceAll('{{ port }}', nuxtPort.toString())
      .replaceAll('{{ database }}', `postgresql://${dbUser}:${dbPassword}@127.0.0.1:5432/${dbName}`)
      .replaceAll('$', '\\$')

    await this.exec(`cat <<EOF | tee ~/sites/${site.domain}.config.js\n${ecosystem}EOF`)
    this.success(`Created ecosystem file ${cyan(`~/sites/${site.domain}.config.js`)}`)
    await this.exec(`pm2 delete ~/sites/${site.domain}.config.js`, true)
    await this.exec(`pm2 flush ${site.domain}`)
    await this.exec(`pm2 save`)
    this.success(`Added ${cyan(site.domain)} to pm2`)

    config.count++
    await this.exec(`cat <<EOF | tee ~/sites/sites.config.json\n${JSON.stringify(config, null, 2)}\nEOF`)
    this.success(`Updated ${cyan('~/sites/sites.config.json')}`)
  }

  async backupSite(site: PruviousSite) {
    const list = await this.listBackups(site)
    const id = list.length ? +list[0].value + 1 : 1
    await this.exec(`mkdir -p ~/backups/${site.domain}/${id}`)

    await this.exec(
      `sudo -u postgres pg_dump ${slugify(site.domain).replace(/[\.-]/g, '_').slice(0, 63)} > ~/backups/${
        site.domain
      }/${id}/database.sql`,
      /^could not change directory to /,
    )
    this.success(`Created database backup ${cyan(`~/backups/${site.domain}/${id}/database.sql`)}`)

    await this.exec(`cp -r ~/sites/${site.domain} ~/backups/${site.domain}/${id}/site`)
    await this.exec(`tar -czf ~/backups/${site.domain}/${id}/site.tar.gz -C ~/backups/${site.domain}/${id}/site .`)
    await this.exec(`rm -rf ~/backups/${site.domain}/${id}/site`)
    this.success(`Created site backup ${cyan(`~/backups/${site.domain}/${id}/site.tar.gz`)}`)
  }

  async restoreSite(site: PruviousSite, backupId: number) {
    const list = await this.listBackups(site)
    const backup = list.find((backup) => +backup.value === backupId)

    if (!backup) {
      this.error(`Backup ${cyan(backupId)} not found for site ${cyan(site.domain)}`)
      process.exit(1)
    }

    await this.exec(`pm2 stop ~/sites/${site.domain}.config.js`, true)
    this.success(`Stopped ${cyan(site.domain)} pm2 process`)

    const dbName = slugify(site.domain).replace(/[\.-]/g, '_').slice(0, 63)
    const dbUser = dbName
    await this.exec(`sudo -u postgres psql -c "DROP DATABASE ${dbName};"`, /^could not change directory to /)
    await this.exec(
      `sudo -u postgres psql -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"`,
      /^could not change directory to /,
    )
    await this.exec(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`, true)
    await this.exec(
      `sudo -u postgres psql -d ${dbName} < ~/backups/${site.domain}/${backupId}/database.sql`,
      /^could not change directory to /,
    )
    this.success(`Restored database backup ${cyan(`~/backups/${site.domain}/${backupId}/database.sql`)}`)

    await this.exec(`rm -rf ~/sites/${site.domain}`)
    await this.exec(`mkdir -p ~/sites/${site.domain}`)
    await this.exec(`tar -xzf ~/backups/${site.domain}/${backupId}/site.tar.gz -C ~/sites/${site.domain}`)
    this.success(`Restored site backup ${cyan(`~/backups/${site.domain}/${backupId}/site.tar.gz`)}`)

    await this.exec(`rm -rf ~/sites/${site.domain}/.cache`, true)
    await this.exec(`pm2 restart ~/sites/${site.domain}.config.js`)
    this.success(`Started ${cyan(site.domain)} with pm2`)
  }

  async listBackups(site: PruviousSite): Promise<{ value: string; label: string; hint: string }[]> {
    const out = await this.exec(`TZ=UTC ls -l --time-style="+%Y-%m-%d %H:%M:%S" -d backups/${site.domain}/*/`, true)

    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(' ')
        const value = parts[7].replace(`backups/${site.domain}/`, '').slice(0, -1)

        return {
          value,
          label: dayjs(`${parts[5]}T${parts[6]}.000Z`).format('YYYY-MM-DD HH:mm:ss'),
          hint: `ID: ${value}`,
        }
      })
      .sort((a, b) => +b.value - +a.value)
  }

  async deploySite(site: PruviousSite) {
    if (!fs.existsSync('.git')) {
      this.error('The current directory is not a git repository')
      process.exit(1)
    }

    const filesOut = await execa('git ls-files --others --exclude-standard --cached', {
      ...execaOptions,
      stdout: 'pipe',
    })
    fs.removeSync('site.tar.gz')
    tar.c(
      { gzip: true, file: 'site.tar.gz' },
      filesOut.stdout.split('\n').filter((v) => v && fs.existsSync(v)),
    )
    consola.success(`Created ${blue('site.tar.gz')} archive`)
    await this.ssh?.putFile('site.tar.gz', `/home/pruvious/sites/${site.domain}.tar.gz`)
    this.success(`Uploaded ${blue('site.tar.gz')} to ${cyan(`~/sites/${site.domain}.tar.gz`)}`)
    await this.exec(`mkdir -p ~/sites/_${site.domain}`)
    await this.exec(`mkdir -p ~/sites/_${site.domain}/public`)
    await this.exec(`mkdir -p ~/sites/${site.domain}/.uploads`)
    await this.exec(`cp -r ~/sites/${site.domain}/.uploads ~/sites/_${site.domain}`)
    await this.exec(`tar -xzf ~/sites/${site.domain}.tar.gz -C ~/sites/_${site.domain}`)
    this.success(`Extracted ${cyan(`${site.domain}.tar.gz`)} to ${cyan(`~/sites/_${site.domain}`)}`)
    await this.exec(`rm ~/sites/${site.domain}.tar.gz`)
    this.success(`Removed ${cyan(`${site.domain}.tar.gz`)}`)
    fs.rmSync('site.tar.gz')
    consola.success(`Removed ${blue('site.tar.gz')}`)
    this.info(`Installing dependencies for ${cyan(site.domain)}...`)
    await this.exec(`pnpm install --dir ~/sites/_${site.domain}`)
    this.clearLastLine().success(`Installed dependencies for ${cyan(site.domain)}`)
    this.info(`Building ${cyan(site.domain)}... ${dim('(this may take a while)')}`)
    await this.exec(`cd ~/sites/_${site.domain}; source ~/.nvm/nvm.sh; pnpm build; cd ~`)
    this.clearLastLine().success(`Built ${cyan(site.domain)}`)

    await this.exec(`rm -rf ~/sites/${site.domain}`)
    await this.exec(`mv ~/sites/_${site.domain} ~/sites/${site.domain}`)
    this.success(`Swapped ${cyan(`~/sites/_${site.domain}`)} with ${cyan(`~/sites/${site.domain}`)}`)

    await this.exec(`rm -rf ~/sites/${site.domain}/.cache`, true)
    await this.exec(`pm2 reload ~/sites/${site.domain}.config.js`)
    await this.exec(`pm2 save`)
    this.success(`Reloaded ${cyan(site.domain)} with pm2`)
  }

  async mirrorSiteUp(site: PruviousSite, force = false) {
    const { driveType, uploadsPath, database } = await getProjectInfo()

    if (driveType === 's3') {
      consola.error('Mirroring S3 drives is not supported yet')
      process.exit(1)
    }

    if (database.startsWith('sqlite:') && !force) {
      consola.warn('Converting SQLite to PostgreSQL may cause unexpected issues')
      const answer = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!answer || typeof answer === 'symbol') {
        process.exit(0)
      }
    }

    const pgProd = await this.exec(
      `grep -o 'NUXT_PRUVIOUS_DATABASE:.*' ~/sites/${site.domain}.config.js | awk -F "'" '{print $2}'`,
    )
    const dbName = site.domain.replace(/[\.-]/g, '_').slice(0, 63)
    const dbUser = dbName

    await this.exec(`pm2 stop ~/sites/${site.domain}.config.js`, true)
    this.success(`Stopped ${cyan(site.domain)} pm2 process`)

    await this.exec(`sudo -u postgres psql -c "DROP DATABASE ${dbName};"`, true)
    await this.exec(
      `sudo -u postgres psql -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"`,
      /^could not change directory to /,
    )
    await this.exec(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`, true)

    if (database.startsWith('postgresql:')) {
      const config = pgConnectionString.parse(database)
      await execa(
        `pg_dump -h ${config.host} -p ${config.port ?? 5432} -U ${config.user} ${config.database} > pruvious.sql`,
        { ...execaOptions, stderr: 'pipe' },
      )
      await this.ssh?.putFile('pruvious.sql', `/home/pruvious/sites/${site.domain}/pruvious.sql`)
      await this.exec(
        `sudo -u postgres psql -d ${dbName} < ~/sites/${site.domain}/pruvious.sql`,
        /^could not change directory to /,
      )
      fs.rmSync('pruvious.sql')
      await this.exec(`rm ~/sites/${site.domain}/pruvious.sql`)
    } else {
      const dbPath = database.replace('sqlite:', '')
      const apiPrefix = (
        (await this.exec(
          `grep -o 'NUXT_PRUVIOUS_API_PREFIX:.*' ~/sites/${site.domain}.config.js | awk -F "'" '{print $2}'`,
        )) || 'api'
      ).replace(/^\/|\/$/g, '')
      const port = (
        await this.exec(`awk '/port/ {gsub(/[^0-9]/,"",$2); print $2}' ~/sites/${site.domain}.config.js`)
      ).trim()
      const urls = [
        `http://localhost:${port}`,
        `http://localhost:${port}/${apiPrefix}/dashboard`,
        `http://localhost:${port}/${apiPrefix}/profile`,
      ]

      await this.ssh?.putFile(dbPath, `/home/pruvious/sites/${site.domain}/pruvious.db`)
      await this.exec(`pm2 start ~/sites/${site.domain}.config.js`)

      for (let i = 0; i < 20; i++) {
        if (await this.exec(`curl -X GET ${urls[i % urls.length]}`, true)) {
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      await this.exec(`pm2 stop ~/sites/${site.domain}.config.js`)
      await this.exec(`sudo -u postgres psql -c "DELETE FROM single_collections;" ${dbName}`, true)

      const output = await this.exec(
        `pgloader --with="data only" sqlite:///home/pruvious/sites/${site.domain}/pruvious.db ${pgProd}`,
      )

      for (const line of output.split('\n')) {
        if (line.includes(' ERROR ')) {
          this.error(line.split(' ERROR ')[1])
        }
      }

      await this.exec(`rm ~/sites/${site.domain}/pruvious.db`)
    }

    this.success(`Mirrored database ${cyan(dbName)}`)

    consola.info(`Mirroring uploads for ${cyan(site.domain)}...`)
    await this.exec(`rm -rf ~/sites/${site.domain}/.uploads`)
    await this.exec(`mkdir -p ~/sites/${site.domain}/.uploads`)
    await this.ssh?.putDirectory(uploadsPath, `/home/pruvious/sites/${site.domain}/.uploads`, {
      recursive: true,
      concurrency: 10,
      validate: (itemPath) => !itemPath.endsWith('.DS_Store'),
    })
    this.clearLastLine().success(`Mirrored uploads for ${cyan(site.domain)}`)

    await this.exec(`rm -rf ~/sites/${site.domain}/.cache`, true)
    await this.exec(`pm2 restart ~/sites/${site.domain}.config.js`)
    this.success(`Started ${cyan(site.domain)} with pm2`)
  }

  async mirrorSiteDown(site: PruviousSite, force = false): Promise<'pg' | 'sqlite'> {
    const { driveType, uploadsPath, database } = await getProjectInfo()

    if (driveType === 's3') {
      consola.error('Mirroring S3 drives is not supported yet')
      process.exit(1)
    }

    if (database.startsWith('sqlite:') && !force) {
      consola.warn('Converting PostgreSQL to SQLite may cause unexpected issues')
      const answer = await consola.prompt('Do you want to continue?', { type: 'confirm', initial: false })

      if (!answer || typeof answer === 'symbol') {
        process.exit(0)
      }
    }

    const dbName = site.domain.replace(/[\.-]/g, '_').slice(0, 63)
    const config = pgConnectionString.parse(database)

    if (database.startsWith('postgresql:')) {
      await this.exec(
        `sudo -u postgres pg_dump ${dbName} > ~/sites/${site.domain}/pruvious.sql`,
        /^could not change directory to /,
      )
      await this.ssh?.getFile('pruvious.sql', `/home/pruvious/sites/${site.domain}/pruvious.sql`)
      await execa(
        `psql -h ${config.host} -p ${config.port ?? 5432} -U ${config.user} ${config.database} < pruvious.sql`,
        { ...execaOptions, stderr: 'pipe' },
      )
      fs.rmSync('pruvious.sql')
      this.success(`Mirrored database ${cyan(dbName)}`)
    } else {
      await this.exec(
        `sudo -u postgres pg_dump --data-only --inserts ${dbName} > ~/sites/${site.domain}/pruvious.sql`,
        /^could not change directory to /,
      )
      await this.ssh?.getFile('.autoload.sql', `/home/pruvious/sites/${site.domain}/pruvious.sql`)
      fs.writeFileSync(
        '.autoload.sql',
        fs
          .readFileSync('.autoload.sql', 'utf-8')
          .replace(/^SET .+/gm, '')
          .replace(/^SELECT pg_catalog\..+/gm, '')
          .replace(/^INSERT INTO public\./gm, 'INSERT INTO ')
          .replace(/^--( .*|$)/gm, '')
          .split('\n')
          .filter(Boolean)
          .join('\n'),
      )
      const dbPath = database.replace('sqlite:', '')
      fs.removeSync(dbPath)
      await this.exec(`rm ~/sites/${site.domain}/pruvious.sql`)
      consola.success(`Created dump file ${blue('.autoload.sql')}`)
    }

    consola.info(`Mirroring uploads for ${cyan(site.domain)}...`)
    if (path.resolve(uploadsPath).startsWith(process.cwd())) {
      fs.emptyDirSync(uploadsPath)
    }
    await this.ssh?.getDirectory(uploadsPath, `/home/pruvious/sites/${site.domain}/.uploads`, {
      recursive: true,
      concurrency: 10,
    })
    this.clearLastLine().success(`Mirrored uploads for ${cyan(site.domain)}`)

    return database.startsWith('postgresql:') ? 'pg' : 'sqlite'
  }

  async removeSite(site: PruviousSite) {
    await this.exec(`pm2 delete ~/sites/${site.domain}.config.js`, true)
    await this.exec(`pm2 flush ${site.domain}`)
    await this.exec(`pm2 save`)
    this.success(`Stopped ${cyan(site.domain)} pm2 process`)
    await this.exec(`sudo rm ~/sites/${site.domain}.config.js`, true)
    this.success(`Removed ecosystem file ${cyan(`~/sites/${site.domain}.config.js`)}`)

    await this.exec(`sudo rm /etc/nginx/sites-enabled/${site.domain}.conf`, true)
    this.success(`Removed nginx config ${cyan(`/etc/nginx/sites-enabled/${site.domain}.conf`)}`)
    await this.exec(`sudo rm /etc/nginx/sites-available/${site.domain}.conf`, true)
    this.success(`Removed nginx config ${cyan(`/etc/nginx/sites-available/${site.domain}.conf`)}`)

    await this.exec(`sudo certbot delete --cert-name ${site.domain} --non-interactive`, true)
    this.success(`Removed certificate for ${cyan(site.domain)}`)

    await this.exec(`sudo nginx -s reload`, /signal process started/)
    this.success('Reloaded nginx')

    await this.exec(`rm -rf ~/sites/${site.domain}`)
    this.success(`Removed directory ${cyan(`~/sites/${site.domain}`)}`)

    const dbUser = slugify(site.domain).replace(/[\.-]/g, '_').slice(0, 63)
    const dbName = dbUser
    await this.exec(`sudo -u postgres psql -c "DROP DATABASE ${dbName};"`, true)
    this.success(`Removed database ${cyan(dbName)}`)
    await this.exec(`sudo -u postgres psql -c "DROP USER ${dbUser};"`, true)
    this.success(`Removed database user ${cyan(dbUser)}`)
  }

  async getSitesConfig(): Promise<{ count: number; email: string }> {
    return this.exec('cat ~/sites/sites.config.json').then((res) => JSON.parse(res))
  }

  disconnect() {
    this.ssh?.dispose()
  }

  private async exec(command: string, ignoreError: boolean | RegExp = false) {
    const out = await this.ssh?.execCommand(
      command.startsWith('pm2') || command.startsWith('pnpm') ? `source ~/.nvm/nvm.sh; ${command}` : command,
    )

    if (
      out?.stderr &&
      (!ignoreError || (ignoreError !== true && !ignoreError.test(out.stderr))) &&
      !this.ignoreErrors
    ) {
      this.error(`Error executing command: ${command}`)
      this.error(out.stderr)
      process.exit(1)
    }

    return out?.stdout ?? ''
  }

  private isLocal() {
    return (
      this.config.host === 'localhost' ||
      this.config.host.startsWith('127.0.0.') ||
      this.config.host.startsWith('192.168.')
    )
  }

  private info(message: any, ...args: any[]) {
    consola.withTag(this.config.name).info(message, ...args)
  }

  private success(message: any, ...args: any[]) {
    consola.withTag(this.config.name).success(message, ...args)
  }

  private error(message: any, ...args: any[]) {
    consola.withTag(this.config.name).error(message, ...args)
  }

  private clearLastLine() {
    process.stdout.moveCursor(0, -1)
    process.stdout.clearLine(0)
    return this
  }
}

async function nginxConfigTemplate(www: boolean) {
  const info = await getProjectInfo()
  const uploadsUrlPrefix = joinRouteParts(info.uploadsUrlPrefix ?? 'uploads').slice(1)
  const uploadsMaxFileSize = info.uploadsMaxFileSize ?? parse('16 MB')

  let config = `map $sent_http_content_type $expires {
  "text/html" epoch;
  "text/html; charset=utf-8" epoch;
  default off;
}
`

  if (uploadsUrlPrefix) {
    config += `
map $request_uri $cache_tag {
  ~/${uploadsUrlPrefix}/ "public, max-age=2592000";
  default "";
}
`
  }

  config +=
    `
server {
  listen 80;
  server_name {{ domainName }}${www ? ' www.{{ domainName }}' : ''};
  rewrite ^(.*) https://{{ domainName }}$1 permanent;
}

### server {
###   listen 443 ssl http2;
###   server_name {{ domainName }}${www ? ' www.{{ domainName }}' : ''};
###   client_max_body_size ${convertBytesToM(uploadsMaxFileSize)};
` +
    (www
      ? `
###   if ($host = "www.{{ domainName }}") {
###     return 301 https://{{ domainName }}$request_uri;
###   }

`
      : '') +
    `
###   gzip on;
###   gzip_types text/css text/plain text/javascript application/javascript application/json application/x-javascript application/xml application/xml+rss application/xhtml+xml application/x-font-ttf application/x-font-opentype application/vnd.ms-fontobject image/svg+xml image/x-icon application/rss+xml application/atom_xml;
###   gzip_min_length 1000;

###   location / {
###     add_header Access-Control-Allow-Origin *;
###     expires $expires;

###     proxy_redirect off;
###     proxy_set_header Host $host;
###     proxy_set_header X-Real-IP $remote_addr;
###     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
###     proxy_set_header X-Forwarded-Proto $scheme;
###     proxy_read_timeout 1m;
###     proxy_connect_timeout 1m;
###     proxy_pass http://127.0.0.1:{{ nuxtPort }}/;

###     rewrite ^/(.*)/$ /$1 permanent;
###   }

###   location /${uploadsUrlPrefix} {
###     alias /home/pruvious/sites/{{ domainName }}/.uploads;
###     add_header Cache-Control "public, max-age=31536000";
###   }

###   ssl_certificate /etc/letsencrypt/live/{{ domainName }}/fullchain.pem;
###   ssl_certificate_key /etc/letsencrypt/live/{{ domainName }}/privkey.pem;
###   include /etc/letsencrypt/options-ssl-nginx.conf;
###   ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
### }
`

  return config
}

function ecosystemTemplate() {
  return `module.exports = {
  apps: [
    {
      name: '{{ domainName }}',
      port: {{ port }},
      exec_mode: 'cluster',
      instances: 'max',
      autorestart: true,
      script: '/home/pruvious/sites/{{ domainName }}/.output/server/index.mjs',
      cwd: '/home/pruvious/sites/{{ domainName }}',
      env: {
        NODE_ENV: 'production',
        NUXT_PRUVIOUS_DATABASE: '{{ database }}',
        NUXT_PRUVIOUS_JWT_SECRET_KEY: '${nanoid(64)}',
        NUXT_PRUVIOUS_UPLOADS_DRIVE_TYPE: 'local',
        NUXT_PRUVIOUS_UPLOADS_DRIVE_PATH: './.uploads',
      },
    },
  ],
}
`
}
