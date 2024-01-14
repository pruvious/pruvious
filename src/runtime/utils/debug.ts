export function isDebugActive(subject: 'database' | '*'): boolean {
  if (typeof process.env.NODE_DEBUG !== 'string') {
    return false
  }

  return process.env.NODE_DEBUG.split(',')
    .map((e) => e.trim())
    .some((e) => e === '*' || e === 'pruvious' || e === 'pruvious:*' || e === `pruvious:${subject}`)
}
