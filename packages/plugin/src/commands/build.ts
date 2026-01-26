import { intro, taskLog } from '@clack/prompts'
import { colors, logger, resolvePath } from '@pruvious/cli-utils'
import { defineCommand } from 'citty'
import fs from 'node:fs'
import { dirname, extname, join } from 'pathe'
import prettyMilliseconds from 'pretty-ms'
import { sharedArgs } from '../utils/args'
import { getSrcFiles } from '../utils/src'

export default defineCommand({
  meta: {
    name: 'build',
    description: 'Build a Pruvious plugin.',
  },
  args: {
    ...sharedArgs,
    src: {
      type: 'positional',
      description: 'Path to plugin source directory (default: `src`)',
      default: 'src',
    },
  },
  async run(ctx) {
    const srcDir = resolvePath(ctx.args.src)
    const distDir = resolvePath('dist')

    if (!fs.existsSync(srcDir)) {
      logger.error(`The source directory ${colors.gray(ctx.args.src)} does not exist.`)
      process.exit(1)
    }

    if (!fs.lstatSync(srcDir).isDirectory()) {
      logger.error(`The path ${colors.yellow(ctx.args.src)} is not a directory.`)
      process.exit(1)
    }

    if (!fs.existsSync(join(srcDir, 'nuxt.config.ts'))) {
      logger.error(
        `The source directory ${colors.yellow(ctx.args.src)} is not a valid Pruvious plugin (missing ${colors.gray('nuxt.config.ts')}).`,
      )
      process.exit(1)
    }

    const start = performance.now()
    const srcFiles = getSrcFiles(srcDir)

    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true })
    }

    intro('Pruvious plugin builder')

    const log = taskLog({ title: 'Building plugin files', limit: 10 })

    for (const file of srcFiles) {
      const relativePath = file.slice(srcDir.length + 1)
      const distFilePath = join(distDir, relativePath)
      const distDirPath = dirname(distFilePath)
      const ext = extname(file)

      log.message(relativePath)

      if (!fs.existsSync(distDirPath)) {
        fs.mkdirSync(distDirPath, { recursive: true })
      }

      if (['.js', '.mjs', '.ts', '.vue'].includes(ext)) {
        let content = fs.readFileSync(file, 'utf-8')

        if (ext === '.vue') {
          content = content.replace(/<script\s+([^>]*\bsetup\b[^>]*)>/gi, '<script $1>\n// @ts-nocheck')
        } else {
          content = `// @ts-nocheck\n${content}`
        }

        fs.writeFileSync(distFilePath, content)
      } else {
        fs.copyFileSync(file, distFilePath)
      }
    }

    const end = performance.now()
    const duration = prettyMilliseconds(end - start)

    log.success(`Built ${colors.green(srcFiles.length)} files in ${colors.green(duration)}.`)
  },
})
