import { withTrailingSlash } from '@pruvious/utils'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'pathe'

const args = process.argv.slice(2)
const url = new URL(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(url)), '..')
const distDir = join(rootDir, 'dist')
const sources = ['app', 'bin', 'modules', 'public', 'server', 'shared', 'file://nuxt.config.ts']

if (args.includes('--add')) {
  writeFile(args[args.indexOf('--add') + 1])
} else if (args.includes('--change')) {
  writeFile(args[args.indexOf('--change') + 1])
} else if (args.includes('--unlink')) {
  deleteFile(args[args.indexOf('--unlink') + 1])
} else {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true })
  }

  let count = 0

  for (const src of sources) {
    if (src.startsWith('file://')) {
      const filePath = join(rootDir, src.slice(7))
      writeFile(filePath)
      count++
    } else {
      const srcDir = withTrailingSlash(join(rootDir, src))

      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir, { recursive: true })

        for (const file of files) {
          const filePath = join(srcDir, file)

          if (fs.lstatSync(filePath).isFile()) {
            writeFile(filePath)
            count++
          }
        }
      }
    }
  }

  console.log(`Built ${count} files (packages/pruvious)`)
  console.log('')
}

function writeFile(path) {
  if (path.startsWith(`${rootDir}/`)) {
    const relativePath = path.slice(rootDir.length + 1)
    const distPath = join(distDir, relativePath)
    const dir = dirname(distPath)

    if (fs.existsSync(path)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      if (path.endsWith('.ts') || path.endsWith('.vue')) {
        let content = fs.readFileSync(path, 'utf-8')

        if (path.endsWith('.ts')) {
          content = `// @ts-nocheck\n${content}`
        } else if (path.endsWith('.vue')) {
          content = content.replace(/<script\s+([^>]*\bsetup\b[^>]*)>/gi, '<script $1>\n// @ts-nocheck')
        }

        fs.writeFileSync(distPath, content)
      } else {
        fs.copyFileSync(path, distPath)
      }
    }
  }
}

function deleteFile(path) {
  if (path.startsWith(`${rootDir}/`)) {
    const relativePath = path.slice(rootDir.length + 1)
    const distPath = join(distDir, relativePath)

    if (fs.existsSync(distPath)) {
      fs.unlinkSync(distPath)
    }
  }
}
