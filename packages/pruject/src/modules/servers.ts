import inquirer from 'inquirer'
import { NodeSSH } from 'node-ssh'
import { awaitEnterKey } from './awaitEnterKey'
import { ServerMeta, getConfig, listServers, updateConfig } from './config'
import { getKeys } from './keys'
import { error, loadingScreen, newLine, ok, term } from './terminal'

export async function selectServer(host?: string, clear: boolean = true): Promise<ServerMeta> {
  const servers = listServers()

  if (host) {
    const server = servers.find((server) => server.host === host)

    if (server) {
      return server
    } else {
      error(`The server ^r${host}^ is not registered in the project.`)
      newLine(2)
      process.exit()
    }
  } else {
    if (clear) {
      term.clear()
    }

    const choices: { name: string; value: string }[] = [
      ...servers.map((server) => ({
        name: server.host + (server.name ? ` (${server.name})` : ''),
        value: server.host,
      })),
      { name: '+ Add new server', value: '__add' },
    ]

    if (servers.length) {
      choices.push({ name: '- Remove server(s)', value: '__remove' })
    }

    return await new Promise<ServerMeta>((resolve) => {
      inquirer
        .prompt([
          {
            type: 'list',
            name: 'host',
            message: 'Select server',
            choices,
          },
        ])
        .then(async (answers) => {
          term.clear()

          if (answers.host === '__add') {
            await addServer()
            resolve(await selectServer(undefined, false))
          } else if (answers.host === '__remove') {
            await removeServers()
            resolve(await selectServer(undefined, false))
          } else {
            resolve(servers.find((server) => server.host === answers.host)!)
          }
        })
    })
  }
}

export async function addServer(): Promise<ServerMeta> {
  const servers = listServers()
  const server: ServerMeta = { name: '', host: '', port: 0 }

  term.clear()

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Host:',
          validate: (input) => {
            if (servers.some((server) => server.host === input)) {
              return 'A server with the same host already exists'
            }

            return !input.trim() ? 'This field is required' : true
          },
        },
      ])
      .then(async (answers) => {
        server.host = answers.host
        resolve()
      })
  })

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'port',
          message: 'Port:',
          default: '22',
          validate: (input) => {
            return !input.match(/^[0-9]+$/) || +input < 0 || +input > 65536
              ? 'The port must be an integer between 0 and 65536'
              : true
          },
        },
      ])
      .then(async (answers) => {
        server.port = +answers.port
        resolve()
      })
  })

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Name or description (optional):',
        },
      ])
      .then(async (answers) => {
        server.name = answers.name
        resolve()
      })
  })

  servers.unshift(server)
  updateConfig({ ...getConfig(), servers })
  term.clear()

  ok('Server has been successfully added.')
  newLine(2)
  term(
    'If you have not yet configured the server, run the following command ^+on the server^ as a superuser:',
  )
  newLine(2)
  term('^ccurl -o- https://pruject.com/ubuntu/install.sh | bash^:')
  newLine(2)
  term('^-Note: This command works only for Ubuntu Server 18, 20, and 22.^:')

  await awaitEnterKey()
  term.clear()

  return server
}

async function removeServers() {
  term.clear()

  await new Promise<void>((resolve) => {
    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'hosts',
          message: 'Select servers to remove',
          choices: listServers().map((server) => ({
            name: server.host + (server.name ? ` (${server.name})` : ''),
            value: server.host,
          })),
        },
      ])
      .then((answers) => {
        term.clear()

        if (answers.hosts.length) {
          const config = getConfig()
          config.servers = config.servers!.filter((server) => !answers.hosts.includes(server.host))
          updateConfig(config)
          ok(
            `Successfully removed ${answers.hosts.length} server${
              answers.hosts.length === 1 ? '' : 's'
            }.`,
          )
          newLine(2)
        }

        resolve()
      })
  })
}

export async function connect(server: ServerMeta): Promise<NodeSSH> {
  const ssh = new NodeSSH()
  const { publicKey, privateKey } = await getKeys(server.host)
  let connected: boolean = false

  term.clear()

  const screen = await loadingScreen(`Connecting to ^c${server.host}^:`)

  await new Promise<void>((resolve) => {
    ssh
      .connect({
        host: server.host,
        port: server.port,
        username: 'pruject',
        privateKey,
        readyTimeout: 10000,
        keepaliveInterval: 10000,
      })
      .then(() => {
        screen.destroy()
        term.clear()
        connected = true
        resolve()
      })
      .catch(async (e) => {
        screen.destroy()
        term.clear()
        error(
          e
            .toString()
            .replace(/^error:\s*/i, '')
            .replace(/\.*$/, '') + '.',
        )
        newLine(2)
        resolve()
      })
  })

  if (!connected) {
    term('Possible solutions:')
    newLine(2)
    term(
      '1. If you have not yet configured the server, run the following command ^+on the server^ as a superuser:',
    )
    newLine(2)
    term('^ccurl -o- https://pruject.com/ubuntu/install.sh | bash^:')
    newLine(2)
    term('2. Run the following command ^+on the server^ as a superuser to add your public key:')
    newLine(2)
    term(`^cecho $'${publicKey}' | sudo tee -a /home/pruject/.ssh/authorized_keys > /dev/null^:`)

    await awaitEnterKey('Press ^cEnter^ to retry')

    return await connect(server)
  }

  return ssh
}
