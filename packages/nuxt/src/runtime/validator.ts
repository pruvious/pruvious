export function isBlockName(value: string): boolean {
  return /^[A-Z0-9][a-zA-Z0-9]*$/.test(value)
}
