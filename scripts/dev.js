import esbuild from 'esbuild'
import { execa } from 'execa'
import fs from 'fs-extra'
import { debounce } from 'perfect-debounce'

const execaOptions = { shell: true, stdout: 'inherit', stderr: 'inherit' }

execa('pnpm exec tailwindcss -i ./src/styles/index.css -o ./src/runtime/assets/style.css --watch', { ...execaOptions })

fs.emptyDirSync('bin')
fs.emptyDirSync('config')
fs.copyFileSync('src/cli/config/define.ts', 'config/index.ts')

const context = await esbuild.context({
  entryPoints: ['src/cli/**/*.ts'],
  outdir: 'bin',
  platform: 'node',
  external: [],
})

context.watch()

let dev
let buffer = ''

function startDev() {
  dev = execa('nuxi dev playground', { ...execaOptions, stderr: 'pipe' })
  dev.stderr.setEncoding('utf8')
  dev.stderr.on('data', onData)
  return dev
}

function onData(data) {
  buffer += data
  restartOnSqlite3Error()
}

const restartOnSqlite3Error = debounce(() => {
  if (buffer.includes('Error') && buffer.includes('sqlite3@')) {
    dev.stderr.off('data', onData)
    dev.kill()
    buffer = ''
    startDev()
  } else {
    process.stdout.write(buffer)
  }
}, 50)

startDev()
