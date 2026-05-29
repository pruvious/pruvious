/**
 * No-op stub aliased in place of native Node addons (`sharp`, `better-sqlite3`) on Cloudflare Workers, where they cannot
 * be bundled. It is never called.
 */
function unavailableOnWorkers() {
  throw new Error('Native Node addons are not available on Cloudflare Workers')
}

export default unavailableOnWorkers
