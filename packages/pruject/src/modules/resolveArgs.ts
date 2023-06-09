import _args from 'args'

interface Args {
  name: string
  sub: string[]
  options: Record<string, any>
}

export const args: Args = {
  name: '',
  sub: [],
  options: {},
}

export function resolveArgs(
  programName: string,
  commands: { name: string; description: string; aliases?: string[] }[],
  options: { name: string; description: string }[] = [],
): Args {
  for (const command of commands) {
    _args.command(command.name, command.description, assign, command.aliases)
  }

  for (const option of options) {
    _args.option(option.name, option.description)
  }

  Object.assign(args.options, _args.parse(process.argv, { name: programName } as any))

  return args
}

function assign(name: string | string[], sub: string[], options: any) {
  args.name = typeof name === 'string' ? name : name[0]
  args.sub = sub
  Object.assign(args.options, options)
}
