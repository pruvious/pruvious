import { center, newLine, term, vCenter } from '@pruject-test/dev'

export async function splashScreen(message: string, enter: string = 'continue'): Promise<void> {
  term.clear()
  term.moveTo(1, 1)

  vCenter(2)
  term(center(`^+${message}^:`))
  newLine()
  term(center(`Press ^cEnter^ to ${enter}`))

  term.moveTo(1, term.height)
  term('^-Press^ ^cQ^ ^-to quit^:')
  term.moveTo(term.width, term.height)

  term.grabInput(true)

  await Promise.race<void>([
    new Promise(async (resolve) => {
      term.on('key', (name: string) => {
        if (name === 'ENTER') {
          term.clear()
          term.grabInput(false)
          term.removeAllListeners('key')
          resolve()
        } else if (name === 'CTRL_C' || name.toLowerCase() === 'q') {
          term.clear()
          term.grabInput(false)
          process.exit()
        }
      })
    }),
    new Promise((resolve) => setTimeout(resolve, 2147483647)),
  ])
}
