import { selectFrom, update } from '#pruvious/server'
import { decryptSecret } from './vault'

/**
 * Bypasses the mask hook and returns the decrypted value. Touches `lastUsedAt` in the
 * background so the dashboard can show when a secret was last consumed.
 *
 * Server-side use only - never return the result to a client.
 */
export async function getDecryptedSecret(id: number): Promise<string> {
  const query = await selectFrom('Secrets')
    .select(['id', 'value'])
    .where('id', '=', id)
    .withCustomContextData({ _ignoreMaskFieldsHook: true })
    .first()

  if (!query.success) {
    throw new Error(`Failed to read secret ${id}: ${query.runtimeError}`)
  }

  if (!query.data) {
    throw new Error(`Secret ${id} not found`)
  }

  const plaintext = decryptSecret(query.data.value as string)

  void update('Secrets')
    .set({ lastUsedAt: Date.now() })
    .where('id', '=', id)
    .withCustomContextData({ _ignoreMaskFieldsHook: true })
    .run()
    .catch(() => {})

  return plaintext
}
