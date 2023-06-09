import { Spawn } from '@pruvious-test/build'
import { camelize, uppercaseFirstLetter } from '@pruvious-test/utils'
import fs from 'fs-extra'
import inquirer from 'inquirer'
import path from 'path'
import { nuxtBlockTemplate, pruviousBlockTemplate } from './templates'
import { error, loadingScreen, newLine, ok, term } from './terminal'

export async function runGenerate(sub: string[]) {
  if (sub[0] === 'action' || sub[0] === 'a') {
    await pruviousGenerate('action', await resolveName(sub.slice(1), 'action name'))
  } else if (sub[0] === 'block' || sub[0] === 'b') {
    generateNuxtBlock(await resolveName(sub.slice(1), 'block name'))
  } else if (sub[0] === 'collection' || sub[0] === 'c') {
    await pruviousGenerate('collection', await resolveName(sub.slice(1), 'collection name'))
  } else if (sub[0] === 'settings' || sub[0] === 's') {
    await pruviousGenerate('settings', await resolveName(sub.slice(1), 'settings group name'))
  } else if (sub[0] === 'validator' || sub[0] === 'v') {
    await pruviousGenerate('validator', await resolveName(sub.slice(1), 'validator name'))
  } else {
    term.clear()

    await new Promise<void>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'sub',
            message: 'What do you want to generate',
            choices: [
              { value: 'action', name: 'Action' },
              { value: 'block', name: 'Block' },
              { value: 'collection', name: 'Collection' },
              { value: 'settings', name: 'Settings group' },
              { value: 'validator', name: 'Validator' },
            ],
          },
        ])
        .then(async (answers) => {
          await runGenerate([answers.sub])
          resolve()
        })
    })
  }
}

async function resolveName(name: string[], promptName: string) {
  if (name.length) {
    return name.join(' ')
  }

  term.clear()

  return await new Promise<string>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'name',
          message: `Enter ${promptName}:`,
          validate: (input) => {
            return !input.trim() ? 'This field is required' : true
          },
        },
      ])
      .then((answers) => {
        resolve(answers.name)
      })
  })
}

async function pruviousGenerate(
  subject: 'action' | 'collection' | 'settings' | 'validator',
  name: string,
) {
  term.clear()

  const screen = await loadingScreen(
    `Generating ^c${subject === 'settings' ? 'settings group' : subject}^:`,
  )
  const spawn = new Spawn({
    command: `npm run pruvious generate ${subject} ${name} -- --path-prefix=packages/pruvious/`,
    cwd: 'packages/pruvious',
  })
  const subscription = spawn.output$.subscribe(({ text }) => {
    if (text.match(/(ERROR|√)/)) {
      screen.destroy()
      term.clear()
      term(text)
    }
  })

  await spawn.run().expectOutput(/(ERROR|√)/)

  subscription.unsubscribe()

  newLine(2)
}

function generateNuxtBlock(name: string) {
  const blockName = uppercaseFirstLetter(camelize(name))
  const pruviousBlockPath = path.resolve(
    process.cwd(),
    `./packages/pruvious/blocks/${blockName}.ts`,
  )
  const nuxtBlockPath = path.resolve(
    process.cwd(),
    `./packages/nuxt/components/blocks/${blockName}.vue`,
  )
  const pruviousTemplate = pruviousBlockTemplate.replace('BlockName', blockName)
  const nuxtTemplate = nuxtBlockTemplate.replace('BlockName', blockName)

  term.clear()

  if (fs.existsSync(pruviousBlockPath)) {
    error(
      `A file with the name ^+${blockName}.ts^ already exists in the ^+packages/pruvious/blocks^ folder.`,
    )
  } else if (fs.existsSync(nuxtBlockPath)) {
    error(
      `A file with the name ^+${blockName}.vue^ already exists in the ^+packages/nuxt/components/blocks^ folder.`,
    )
  } else {
    fs.ensureDirSync('packages/pruvious/blocks')
    fs.ensureDirSync('packages/nuxt/components/blocks')

    fs.writeFileSync(pruviousBlockPath, pruviousTemplate)
    fs.writeFileSync(nuxtBlockPath, nuxtTemplate)

    ok(
      `Block ^c${blockName}^ successfully created in ^cpackages/pruvious/blocks/${blockName}.ts^ and ^gpackages/nuxt/components/block/${blockName}.vue^:`,
    )
  }

  newLine(2)
}
