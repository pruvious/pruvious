export interface PruviousConfig {
  /**
   * Deployment servers.
   */
  servers: PruviousServer[]
}

export interface PruviousServer {
  /**
   * The server's name used for identification in the CLI.
   * The name must be unique and can only contain lowercase letters, numbers, and hyphens.
   */
  name: string

  /**
   * Hostname or IP address of the server.
   */
  host: string

  /**
   * SSH private key required to connect to the server.
   */
  privateKey: string

  /**
   * SSH port of the server.
   *
   * @default 22
   */
  port?: number

  /**
   * Sites hosted on this server.
   */
  sites: PruviousSite[]
}

export interface PruviousSite {
  /**
   * Domain name of the site.
   */
  domain: string

  /**
   * Redirect non-www to www.
   */
  forceWWW: boolean

  /**
   * Do not set up www subdomain.
   */
  noWWW: boolean

  /**
   * Append trailing slashes to URLs.
   */
  trailing: boolean
}

export function definePruviousConfig(config: PruviousConfig) {
  return config
}
