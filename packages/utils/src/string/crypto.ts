/**
 * Generates a cryptographically secure random string.
 * You can specify the `length` of the secret, which defaults to `64` characters.
 *
 * @throws an error if the `crypto` object is not available.
 */
export function generateSecureRandomString(length: number = 64): string {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : null

  if (!cryptoObj || !cryptoObj.getRandomValues) {
    throw new Error('Crypto support not available')
  }

  const bytesNeeded = Math.ceil(length / 2)
  const randomBytes = new Uint8Array(bytesNeeded)

  cryptoObj.getRandomValues(randomBytes)

  const hex = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return hex.slice(0, length)
}
