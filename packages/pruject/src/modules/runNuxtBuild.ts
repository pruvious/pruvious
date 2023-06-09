import { Spawn, pc } from '@pruvious-test/build'
import fs from 'fs-extra'
import path from 'path'

export async function runNuxtBuild(showOutput: boolean = true) {
  await new Spawn({
    command: 'npm run build',
    cwd: 'packages/nuxt',
    showOutput,
    outputPrefix: pc.bgGreen(' N '),
  })
    .run()
    .expectOutput(/Nitro server built/)

  const packageJson1 = fs.readJsonSync(path.resolve(process.cwd(), 'packages/nuxt/package.json'))
  const packageJson2 = fs.readJsonSync(
    path.resolve(process.cwd(), 'packages/nuxt/.output/server/package.json'),
  )

  if (packageJson1.version) {
    packageJson2.version = packageJson1.version

    fs.writeJsonSync(
      path.resolve(process.cwd(), 'packages/nuxt/.output/server/package.json'),
      packageJson2,
      { spaces: 2 },
    )
  }
}
