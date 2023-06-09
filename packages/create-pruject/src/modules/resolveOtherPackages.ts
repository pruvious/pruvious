import { newLine, term } from '@pruject-test/dev'
import inquirer from 'inquirer'

export interface OtherPackages {
  pinia: boolean
  prettier: boolean
  tailwind: boolean
}

export async function resolveOtherPackages(
  packages: OtherPackages,
  clear: boolean,
): Promise<OtherPackages> {
  if (clear) {
    term.clear()
  } else {
    newLine()
  }

  return await new Promise<OtherPackages>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'packages',
          message: 'Install aditional packages:',
          choices: [
            {
              value: 'pinia',
              name: 'Pinia (Vue.js store library)',
              short: 'Pinia',
              checked: packages.pinia,
            },
            {
              value: 'prettier',
              name: 'Prettier (code formatter)',
              short: 'Prettier',
              checked: packages.prettier,
            },
            {
              value: 'tailwind',
              name: 'Tailwind CSS (CSS framework)',
              short: 'Tailwind CSS',
              checked: packages.tailwind,
            },
          ],
        },
      ])
      .then(async (answers) => {
        resolve({
          pinia: answers.packages.includes('pinia'),
          prettier: answers.packages.includes('prettier'),
          tailwind: answers.packages.includes('tailwind'),
        })
      })
  })
}
