import { error, isPruject, newLine, term } from '@pruject-test/dev'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import path from 'path'

export async function resolveDir(
  check: 'empty' | 'pruject',
  errorMessage?: string,
): Promise<string> {
  term.clear()

  if (errorMessage) {
    error(errorMessage)
    newLine(2)
  }

  return await new Promise<string>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'dir',
          message: 'Enter a directory name or path where you would like to install the project:',
          validate: (input) => {
            return !input.trim() ? 'This field is required' : true
          },
        },
      ])
      .then(async (answers) => {
        const dir = path.resolve(process.cwd(), answers.dir.trim())

        if (check === 'empty' && fs.existsSync(dir) && fs.readdirSync(dir).length) {
          resolve(await resolveDir(check, 'The project directory must be empty.'))
        } else if (
          check === 'pruject' &&
          fs.existsSync(dir) &&
          fs.readdirSync(dir).length &&
          !isPruject(dir)
        ) {
          resolve(await resolveDir(check, 'The selected directory is not a project.'))
        }

        resolve(dir)
      })
  })
}
