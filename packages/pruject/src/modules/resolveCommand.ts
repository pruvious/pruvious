import inquirer from 'inquirer'
import { args } from './resolveArgs'
import { term } from './terminal'

export async function resolveCommand(): Promise<void> {
  term.clear()

  return await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'command',
          message: 'Select a command',
          choices: [
            { value: 'dev', name: 'Start development servers' },
            {
              value: 'generate',
              name: 'Create an action, block, collection, settings group, or validator',
            },
            { value: 'update', name: 'Update Pruvious dependencies' },
            { value: 'backup', name: 'Manage CMS backups' },
            { value: 'deploy', name: 'Deploy website' },
            { value: 'mirror', name: 'Mirror content to/from server' },
            { value: 'build', name: 'Build Nuxt app' },
          ],
        },
      ])
      .then(async (answers) => {
        args.name = answers.command
        term.clear()
        resolve()
      })
  })
}
