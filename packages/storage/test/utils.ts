import { getRandomPort } from 'get-port-please'
import { Miniflare } from 'miniflare'

/**
 * Creates a new Miniflare to simulate a Cloudflare worker environment.
 *
 * @returns the Miniflare instance and the associated R2 bucket.
 */
export async function createMiniflare() {
  const mf = new Miniflare({
    r2Buckets: ['BUCKET'],
    modules: true,
    port: await getRandomPort(),
    script: 'export default { async fetch(request, env, ctx) { return Response() } }',
  })

  return { mf, bucket: await mf.getR2Bucket('BUCKET') }
}
