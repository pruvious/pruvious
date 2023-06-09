import { newLine, term } from './terminal'

export async function awaitEnterKey(message: string = 'Press ^cEnter^ to continue'): Promise<void> {
  if (message) {
    newLine(2)
    term(message)
  }

  term.grabInput(true)

  await Promise.race<void>([
    new Promise(async (resolve) => {
      term.on('key', (name: string) => {
        if (name === 'ENTER') {
          term.grabInput(false)
          term.removeAllListeners('key')
          resolve()
        } else if (name === 'CTRL_C' || name.toLowerCase() === 'q') {
          term.grabInput(false)
          process.exit()
        }
      })
    }),
    new Promise((resolve) => setTimeout(resolve, 2147483647)),
  ])
}
