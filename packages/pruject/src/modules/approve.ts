import inquirer from 'inquirer'
import { newLine, warn } from './terminal'

export async function approve(
  warnMessage: string,
  continueMessage: string = 'Do you want to continue?',
): Promise<boolean> {
  warn(warnMessage)
  newLine(2)

  return await new Promise<boolean>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'answer',
          message: continueMessage,
        },
      ])
      .then(async (answers) => {
        resolve(answers.answer)
      })
  })
}
