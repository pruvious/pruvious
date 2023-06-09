import { pc, Spawn } from '@pruvious-test/build'

export async function runNuxtDev() {
  await new Spawn({
    command: 'npm run dev',
    cwd: 'packages/nuxt',
    showOutput: true,
    outputPrefix: pc.bgGreen(' N '),
  })
    .run()
    .expectOutput(/Nitro built/)
}
