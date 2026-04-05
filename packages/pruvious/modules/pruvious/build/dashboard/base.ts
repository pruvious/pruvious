import { useNuxt } from 'nuxt/kit'

/**
 * Generates the `#pruvious/dashboard/base.ts` file content.
 */
export function getDashboardBaseFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  return [
    `/**`,
    ` * The base path for the dashboard.`,
    ` * This setting comes from the Nuxt config \`pruvious.dashboard.basePath\` and is formatted to always start and end with a forward slash.`,
    ` */`,
    `export const dashboardBasePath = '${pruviousOptions.dashboard.basePath}'`,
    ``,
    `/**`,
    ` * Controls which stylesheets are retained in the dashboard by filtering based on selector content.`,
    ` * Any stylesheet without rules containing these strings will be automatically disabled.`,
    ` */`,
    `export const filterStylesheets = ${JSON.stringify(pruviousOptions.dashboard.filterStylesheets)}`,
    ``,
  ].join('\n')
}
