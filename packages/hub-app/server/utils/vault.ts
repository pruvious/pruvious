import { isString } from '@pruvious/utils'
import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12
const TAG_BYTES = 16
const VERSION = 'v1'

let cachedKey: Buffer | null = null

/**
 * Resolves the master encryption key from `PRUVIOUS_HUB_MASTER_KEY` (64-char hex string).
 * The key is provisioned by the `@pruvious/hub` CLI on install and injected on start.
 *
 * @throws if the env var is missing or malformed.
 */
export function getMasterKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const raw = process.env.PRUVIOUS_HUB_MASTER_KEY?.trim()

  if (!raw) {
    throw new Error(
      'PRUVIOUS_HUB_MASTER_KEY is not set. The hub CLI provisions this automatically; reinstall or upgrade the hub-app.',
    )
  }

  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('PRUVIOUS_HUB_MASTER_KEY must be a 64-character hex string (32 bytes).')
  }

  cachedKey = Buffer.from(raw, 'hex')
  return cachedKey
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM using the master key.
 * Returns a self-describing token: `v1:<base64-iv>:<base64-tag>:<base64-ciphertext>`.
 */
export function encryptSecret(plaintext: string): string {
  const key = getMasterKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * Decrypts a token produced by `encryptSecret`.
 * Throws if the token is malformed, the version is unknown, or authentication fails.
 */
export function decryptSecret(token: string): string {
  const parts = token.split(':')

  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid encrypted secret format')
  }

  const iv = Buffer.from(parts[1]!, 'base64')
  const tag = Buffer.from(parts[2]!, 'base64')
  const ciphertext = Buffer.from(parts[3]!, 'base64')

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('Invalid encrypted secret payload')
  }

  const key = getMasterKey()
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return plaintext.toString('utf8')
}

/**
 * Checks whether a value looks like a vault token (rather than plaintext).
 * Used by input filters to avoid double-encrypting an already-stored value on update.
 */
export function isEncryptedToken(value: unknown): value is string {
  if (!isString(value)) {
    return false
  }

  const parts = value.split(':')
  return parts.length === 4 && parts[0] === VERSION
}
