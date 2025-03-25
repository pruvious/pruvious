import { clearArray } from '@pruvious/utils'

const clientViteServers: any[] = []

/**
 * Registers a client Vite server instance.
 */
export function onViteServerCreated(server: any, env: { isClient: boolean }) {
  if (env.isClient) {
    clientViteServers.push(server)
  }
}

/**
 * Retrieves the client Vite server instances.
 */
export function getClientViteServers() {
  return clientViteServers
}

/**
 * Clears the stored client Vite server instances.
 */
export function clearClientViteServers() {
  clearArray(clientViteServers)
}
