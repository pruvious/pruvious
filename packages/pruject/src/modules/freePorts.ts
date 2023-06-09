import detectPort from 'detect-port'
import fs from 'fs-extra'
import kill from 'kill-port'
import path from 'path'
import { approve } from './approve'
import { term } from './terminal'

export async function freePorts(force: boolean): Promise<void> {
  await freePort(getPruviousPort(), 'pruvious', force)
  await freePort(getNuxtPort(), 'nuxt', force)
}

async function freePort(port: number, subject: 'pruvious' | 'nuxt', force: boolean): Promise<void> {
  await new Promise<void>((resolve) => {
    detectPort(port).then(async (freePort: number) => {
      if (port === freePort) {
        resolve()
      } else {
        term.clear()

        const confirmation =
          force ||
          (await approve(
            subject === 'pruvious'
              ? `The port ^c${port}^ (Pruvious) is already in use.`
              : `The port ^g${port}^ (Nuxt) is already in use.`,
            'Do you want to terminate the process that is currently using this port?',
          ))

        if (confirmation) {
          kill(port).then(() => resolve())
        } else {
          process.exit()
        }
      }
    })
  })
}

export function getPruviousPort(): number {
  const env = path.resolve(process.cwd(), 'packages/pruvious/.env')

  if (fs.existsSync(env)) {
    const match = fs.readFileSync(env, 'utf-8').match(/PORT\s*=\s*([0-9]+)/)
    return match ? +match[1] : 2999
  }

  return 2999
}

export function getNuxtPort(): number {
  const env = path.resolve(process.cwd(), 'packages/nuxt/nuxt.config.ts')

  if (fs.existsSync(env)) {
    const match = fs.readFileSync(env, 'utf-8').match(/devServer\s*:\s*{[^}]+port\s*:\s*([0-9]+)/)
    return match ? +match[1] : 3000
  }

  return 3000
}
