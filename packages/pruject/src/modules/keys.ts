import crypto from 'crypto'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import sshpk from 'sshpk'
import { awaitEnterKey } from './awaitEnterKey'
import { newLine, term } from './terminal'

export async function getKeys(host: string): Promise<{ publicKey: string; privateKey: string }> {
  const keyPath = path.resolve(process.cwd(), `.ssh/${host}.json`)

  if (fs.existsSync(keyPath)) {
    return fs.readJsonSync(keyPath)
  } else {
    const keys = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    })

    const privateKey = sshpk.parsePrivateKey(keys.privateKey, 'pem', {
      filename: os.userInfo().username,
    })

    keys.privateKey = privateKey.toString('ssh-private')
    keys.publicKey = privateKey.toPublic().toString('ssh')

    fs.ensureDirSync(path.resolve(process.cwd(), `.ssh`))
    fs.writeJsonSync(keyPath, keys, { spaces: 2 })

    await showAddPublicKeyInstruction(host)

    return keys
  }
}

export async function showAddPublicKeyInstruction(host: string): Promise<void> {
  const keyPath = path.resolve(process.cwd(), `.ssh/${host}.json`)

  if (fs.existsSync(keyPath)) {
    const { publicKey } = fs.readJsonSync(keyPath)

    term.clear()
    term('Run the following command ^+on the server^ as a superuser to add your public key:')
    newLine(2)
    term(`^cecho $'${publicKey}' | sudo tee -a /home/pruject/.ssh/authorized_keys > /dev/null^:`)

    await awaitEnterKey()
  }
}
