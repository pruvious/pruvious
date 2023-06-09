import { pc, Spawn } from '@pruvious-test/build'
import { getPruviousPort } from './freePorts'
import open from './open'

export async function runPruviousDev(openInBrowser: boolean) {
  await new Spawn({
    command: 'npm run dev',
    cwd: 'packages/pruvious',
    showOutput: true,
    outputPrefix: pc.bgCyan(' P '),
  })
    .run()
    .expectOutput(/started server/)

  if (openInBrowser) {
    await open(`http://localhost:${getPruviousPort()}`)
  }
}
