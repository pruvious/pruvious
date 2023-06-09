import terminalKit from 'terminal-kit'

export const term = terminalKit.terminal

export function center(text: string, offset: number = 0): string {
  const parsedText = text
    .replace(/\^(?:[;#\-+_\/!krgybmcwKRGYBMCWkrgybmcwKRGYBMCW]|\[.+?\])(.+?)\^:?/g, '$1')
    .replace(/\^\^/g, '^')
  const spaces = Math.max(0, Math.floor(term.width / 2 - (parsedText + offset).length / 2))
  return ' '.repeat(spaces) + text
}

export function newLine(count: number = 1): void {
  term('\n'.repeat(count))
}

export function vCenter(linesToDisplay: number = 1): void {
  const lines = Math.floor(term.height / 2 - linesToDisplay / 2)
  newLine(lines)
}

export function ok(text: string): void {
  term(`^g√^ ${text}`)
}

export function warn(text: string): void {
  term(`^[bg:yellow] WARN ^ ${text}`)
}

export function error(text: string): void {
  term(`^[bg:red] ERROR ^ ${text}`)
}

export async function loadingScreen(
  text: string,
): Promise<terminalKit.Terminal.AnimatedText & { destroy: () => void }> {
  term.clear()
  term.moveTo(1, 1)

  vCenter(2)
  term(center(text))
  newLine()
  term(center('', -1.5))

  return (await term.spinner('impulse')) as any
}
