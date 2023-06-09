import fs from 'fs-extra'
import path from 'path'

export type Stubs = (string | [string, (content: string) => string])[]

export function copyStubs(from: string, to: string, stubs: Stubs): void {
  for (const stub of stubs) {
    if (typeof stub === 'string') {
      fs.copySync(path.resolve(__dirname, `../stubs/${from}/${stub}.txt`), path.resolve(to, stub))
    } else {
      const content = fs.readFileSync(
        path.resolve(__dirname, `../stubs/${from}/${stub[0]}.txt`),
        'utf-8',
      )

      fs.writeFileSync(path.resolve(to, stub[0]), stub[1](content))
    }
  }
}
