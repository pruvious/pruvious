import { randomBytes } from 'node:crypto'
import { shellQuote, type SshSession } from '../sshClient'
import { writeDeployLog } from '../deployLog'

const APT_PACKAGES = [
  'curl',
  'ca-certificates',
  'gnupg',
  'tar',
  'rsync',
  'nginx',
  'certbot',
  'python3-certbot-nginx',
  'build-essential',
]

export interface ProvisionPaths {
  appRoot: string
  releasesDir: string
  sharedDir: string
  uploadsDir: string
  managedEnvFile: string
}

export function buildPaths(slug: string): ProvisionPaths {
  const appRoot = `/var/www/pruvious/${slug}`
  return {
    appRoot,
    releasesDir: `${appRoot}/releases`,
    sharedDir: `${appRoot}/shared`,
    uploadsDir: `${appRoot}/shared/.uploads`,
    managedEnvFile: `${appRoot}/shared/.env-managed.json`,
  }
}

/**
 * Installs the base apt packages, the requested Node.js major (via NodeSource), and PM2.
 * Safe to call at the top of every deploy: every step short-circuits when already done.
 */
export async function provisionBaseSystem(
  ssh: SshSession,
  deploymentId: number,
  opts: { nodeVersion?: string | null; installPostgres: boolean; sshUser: string },
): Promise<void> {
  await writeDeployLog(deploymentId, '[vps] checking base packages')

  const aptCheck = await ssh.exec(
    `dpkg-query -W -f='\${db:Status-Status}\\n' ${APT_PACKAGES.map(shellQuote).join(' ')} 2>/dev/null | grep -cv '^installed$' || true`,
    { allowFail: true, stream: false },
  )
  const missingCount = parseInt(aptCheck.stdout.trim(), 10) || 0

  if (missingCount > 0) {
    await writeDeployLog(deploymentId, `[vps] installing apt packages (${missingCount} missing)`)
    await ssh.exec('apt-get update', { sudo: true })
    await ssh.exec(`DEBIAN_FRONTEND=noninteractive apt-get install -y ${APT_PACKAGES.join(' ')}`, { sudo: true })
  } else {
    await writeDeployLog(deploymentId, '[vps] base packages already present')
  }

  const targetNodeMajor = (opts.nodeVersion ?? '22').toString().trim() || '22'
  const nodeCheck = await ssh.exec(`node -v 2>/dev/null || echo missing`, { allowFail: true, stream: false })
  const currentNode = nodeCheck.stdout.trim()
  const matches = currentNode.match(/^v(\d+)\./)
  const currentMajor = matches?.[1] ?? null

  if (currentMajor !== targetNodeMajor) {
    await writeDeployLog(
      deploymentId,
      `[vps] installing Node.js ${targetNodeMajor}.x (current: ${currentNode || 'missing'})`,
    )
    await ssh.exec(`curl -fsSL https://deb.nodesource.com/setup_${targetNodeMajor}.x | bash -`, { sudo: true })
    await ssh.exec('DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs', { sudo: true })
  } else {
    await writeDeployLog(deploymentId, `[vps] Node.js ${currentNode} already installed`)
  }

  const pm2Check = await ssh.exec('command -v pm2', { allowFail: true, stream: false })
  if (pm2Check.exitCode !== 0) {
    await writeDeployLog(deploymentId, '[vps] installing pm2 globally')
    await ssh.exec('npm install -g pm2', { sudo: true })
    const home = opts.sshUser === 'root' ? '/root' : `/home/${opts.sshUser}`
    await ssh.exec(`pm2 startup systemd -u ${shellQuote(opts.sshUser)} --hp ${shellQuote(home)}`, { sudo: true })
  } else {
    await writeDeployLog(deploymentId, '[vps] pm2 already installed')
  }

  if (opts.installPostgres) {
    const pgCheck = await ssh.exec('command -v psql', { allowFail: true, stream: false })
    if (pgCheck.exitCode !== 0) {
      await writeDeployLog(deploymentId, '[vps] installing PostgreSQL')
      await ssh.exec('DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql', { sudo: true })
    } else {
      await writeDeployLog(deploymentId, '[vps] PostgreSQL already installed')
    }
  }
}

/**
 * Ensures the per-target app root layout exists and is owned by the SSH user, so
 * subsequent writes from the deployer don't need sudo.
 */
export async function provisionAppLayout(
  ssh: SshSession,
  deploymentId: number,
  paths: ProvisionPaths,
  sshUser: string,
): Promise<void> {
  await writeDeployLog(deploymentId, `[vps] ensuring app layout at ${paths.appRoot}`)
  await ssh.exec(
    `mkdir -p ${shellQuote(paths.releasesDir)} ${shellQuote(paths.sharedDir)} ${shellQuote(paths.uploadsDir)}`,
    { sudo: true },
  )
  await ssh.exec(`chown -R ${shellQuote(sshUser)}:${shellQuote(sshUser)} ${shellQuote(paths.appRoot)}`, { sudo: true })
}

export interface PostgresCredentials {
  databaseUrl: string
  password: string
}

/**
 * Creates a per-target Postgres role and database. The password is generated on first
 * provision and persisted in `paths.managedEnvFile` on the VPS so reruns recover the
 * same connection URL.
 */
export async function provisionPostgres(
  ssh: SshSession,
  deploymentId: number,
  slug: string,
  paths: ProvisionPaths,
): Promise<PostgresCredentials> {
  const dbName = `pruvious_${slug.replace(/-/g, '_')}`
  const role = dbName
  const managed = await readManagedState(ssh, paths.managedEnvFile)

  let password = managed.postgresPassword as string | undefined
  if (!password) {
    password = randomBytes(24).toString('base64url')
    managed.postgresPassword = password
    await writeManagedState(ssh, paths.managedEnvFile, managed)
    await writeDeployLog(deploymentId, '[vps] generated new postgres password (stored in shared/.env-managed.json)')
  }

  const pwSql = password.replace(/'/g, "''")

  const sql = `DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${role}', '${pwSql}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${role}', '${pwSql}');
  END IF;
END $$;
SELECT 'CREATE DATABASE ${dbName} OWNER ${role}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}')\\gexec`

  await writeDeployLog(deploymentId, `[vps] ensuring postgres role + database "${dbName}"`)
  await ssh.exec(`sudo -u postgres psql -v ON_ERROR_STOP=1 -X <<'PSQLEOF'\n${sql}\nPSQLEOF`, {
    sudo: true,
    stream: false,
  })

  const url = `postgres://${role}:${encodeURIComponent(password)}@localhost:5432/${dbName}`
  return { databaseUrl: url, password }
}

/**
 * Writes an HTTP-only nginx server block proxying `domain` to `127.0.0.1:<port>`,
 * enables the site, and reloads. The HTTPS block is added by certbot's `--nginx` plugin
 * in `ensureCert()`.
 */
export async function ensureNginxSite(
  ssh: SshSession,
  deploymentId: number,
  slug: string,
  domain: string,
  port: number,
): Promise<void> {
  const config = `server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
`
  const available = `/etc/nginx/sites-available/pruvious-${slug}`
  const enabled = `/etc/nginx/sites-enabled/pruvious-${slug}`

  await writeDeployLog(deploymentId, `[vps] writing nginx site pruvious-${slug} -> 127.0.0.1:${port}`)
  await ssh.writeFile(available, config, { sudo: true })
  await ssh.exec(`ln -sfn ${shellQuote(available)} ${shellQuote(enabled)}`, { sudo: true })
  await ssh.exec('nginx -t && systemctl reload nginx', { sudo: true })
}

/**
 * Issues a Let's Encrypt certificate via certbot's nginx plugin. On subsequent deploys
 * `ensureNginxSite()` has rewritten the HTTP-only block, so certbot runs again with
 * `--reinstall --redirect` to re-apply the HTTPS server block from the existing cert
 * (no Let's Encrypt API call).
 */
export async function ensureCert(ssh: SshSession, deploymentId: number, domain: string, email: string): Promise<void> {
  const certCheck = await ssh.exec(`test -f /etc/letsencrypt/live/${shellQuote(domain).slice(1, -1)}/fullchain.pem`, {
    sudo: true,
    allowFail: true,
    stream: false,
  })

  if (certCheck.exitCode === 0) {
    await writeDeployLog(deploymentId, `[vps] cert for ${domain} already exists, re-applying nginx redirect`)
    await ssh.exec(
      `certbot --nginx --non-interactive --reinstall --redirect -d ${shellQuote(domain)} -m ${shellQuote(email)} --agree-tos`,
      { sudo: true },
    )
    return
  }

  await writeDeployLog(deploymentId, `[vps] requesting Let's Encrypt cert for ${domain}`)
  await ssh.exec(
    `certbot --nginx --non-interactive --redirect --agree-tos -d ${shellQuote(domain)} -m ${shellQuote(email)}`,
    { sudo: true },
  )
}

/**
 * Writes the PM2 ecosystem file and runs `pm2 startOrReload`, which starts the process
 * when missing or graceful-reloads it when running.
 */
export async function ensurePm2App(
  ssh: SshSession,
  deploymentId: number,
  slug: string,
  paths: ProvisionPaths,
  sshUser: string,
): Promise<void> {
  const ecosystem = `module.exports = {
  apps: [
    {
      name: 'pruvious-${slug}',
      script: 'current/.output/server/index.mjs',
      cwd: '${paths.appRoot}',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env_file: 'current/.env',
      env: { NODE_ENV: 'production' },
    },
  ],
}
`
  const ecosystemPath = `${paths.sharedDir}/ecosystem.config.cjs`
  await ssh.writeFile(ecosystemPath, ecosystem)

  await writeDeployLog(deploymentId, `[vps] pm2 startOrReload pruvious-${slug}`)
  await ssh.exec(`pm2 startOrReload ${shellQuote(ecosystemPath)} --update-env`, { stream: true })
  await ssh.exec('pm2 save', { stream: false })
  // Recover ownership of ~/.pm2 if the initial `pm2 startup` left it root-owned.
  if (sshUser !== 'root') {
    await ssh.exec(
      `chown -R ${shellQuote(sshUser)}:${shellQuote(sshUser)} /home/${shellQuote(sshUser).slice(1, -1)}/.pm2`,
      {
        sudo: true,
        allowFail: true,
        stream: false,
      },
    )
  }
}

interface ManagedState {
  postgresPassword?: string
  [key: string]: unknown
}

async function readManagedState(ssh: SshSession, file: string): Promise<ManagedState> {
  const result = await ssh.exec(`cat ${shellQuote(file)} 2>/dev/null || echo '{}'`, {
    allowFail: true,
    stream: false,
  })
  try {
    return JSON.parse(result.stdout || '{}') as ManagedState
  } catch {
    return {}
  }
}

async function writeManagedState(ssh: SshSession, file: string, state: ManagedState): Promise<void> {
  await ssh.writeFile(file, JSON.stringify(state, null, 2), { mode: '600' })
}
