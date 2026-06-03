import { textAreaField } from '#pruvious/server'
import { isString } from '@pruvious/utils'
import { encryptSecret, isEncryptedToken } from './vault'

type TextAreaFieldOptions = Parameters<typeof textAreaField>[0]

/**
 * Encrypts on write with the hub master key (AES-256-GCM via `encryptSecret`). Read the
 * plaintext server-side with `getDecryptedSecret`. Pair with the standard `denyWhere`/
 * `maskFields` hooks at the collection level to keep dashboard reads safe.
 *
 * Backed by a textarea so SSH keys and certificates edit cleanly; short tokens stay
 * compact thanks to `resize: 'auto'`. Already-encrypted tokens pass through untouched,
 * so editing a record without changing the secret is idempotent.
 *
 * Owns `inputFilters.beforeQueryExecution` - any user-supplied filter on that slot is
 * overridden.
 */
export function secretField(options: TextAreaFieldOptions = {}): ReturnType<typeof textAreaField> {
  return textAreaField({
    ...options,
    inputFilters: {
      ...options.inputFilters,
      beforeQueryExecution: (value): string | undefined => {
        if (isString(value) && value.length > 0 && !isEncryptedToken(value)) {
          return encryptSecret(value)
        }
        return value as string | undefined
      },
    },
    ui: {
      dataTable: false,
      ...options.ui,
    },
  })
}
