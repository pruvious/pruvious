import { Spawn, pc } from '@pruvious/build'
import fs from 'fs-extra'
import path from 'path'

export async function runPruviousBuild(showOutput: boolean = true) {
  await new Spawn({
    command: 'npm run build',
    cwd: 'packages/pruvious',
    showOutput,
    outputPrefix: pc.bgCyan(' P '),
  })
    .run()
    .expectOutput(/To start the server in production mode/)

  fs.writeFileSync(
    path.resolve(process.cwd(), 'packages/pruvious/.output/server.js'),
    "process.env.PRUVIOUS_OUTPUT_DIR=__dirname\nrequire('@pruvious/cms/server.js')",
  )
}
