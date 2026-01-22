import { camelCase } from '@pruvious/utils'
import { useNuxt } from 'nuxt/kit'
import { relative } from 'pathe'
import { debug } from '../../debug/console'
import {
  resolveActionCallbackFiles,
  resolveActionDefinitionFiles,
  resolveFilterCallbackFiles,
  resolveFilterDefinitionFiles,
} from '../../hooks/resolver'

/**
 * Generates the `#pruvious/server/hooks.ts` file content.
 */
export function getServerHooksFileContent() {
  const nuxt = useNuxt()
  const pruviousOptions = nuxt.options.runtimeConfig.pruvious

  debug(`Generating <${relative(nuxt.options.workspaceDir, pruviousOptions.dir.build)}/server/hooks.ts>`)

  const actionDefinitionFiles = resolveActionDefinitionFiles()
  const serverActionDefinitionEntries = Object.entries(actionDefinitionFiles.server)
  const actionCallbackFiles = resolveActionCallbackFiles()
  const serverActionCallbackEntries = Object.entries(actionCallbackFiles.server)
  const filterDefinitionFiles = resolveFilterDefinitionFiles()
  const serverFilterDefinitionEntries = Object.entries(filterDefinitionFiles.server)
  const filterCallbackFiles = resolveFilterCallbackFiles()
  const serverFilterCallbackEntries = Object.entries(filterCallbackFiles.server)

  return [
    ...(nuxt.options.runtimeConfig._tsCheckPruvious ? [] : [`// @ts-nocheck`]),
    ...serverActionDefinitionEntries.map(
      ([name, { file }]) => `import type _${name.split(':').map(camelCase).join('_')}Action from '${file.import}'`,
    ),
    ...serverFilterDefinitionEntries.map(
      ([name, { file }]) => `import type _${name.split(':').map(camelCase).join('_')}Filter from '${file.import}'`,
    ),
    ``,
    `/**`,
    ` * Type representing all defined server-side action hooks.`,
    ` * The keys are the action names, and the values are the \`Action\` definition objects.`,
    ` */`,
    `export type Actions = {`,
    ...serverActionDefinitionEntries.map(
      ([name]) => `  '${name}': typeof _${name.split(':').map(camelCase).join('_')}Action,`,
    ),
    `}`,
    ``,
    `/**`,
    ` * Type representing all defined server-side filter hooks.`,
    ` * The keys are the filter names, and the values are the \`Filter\` definition objects.`,
    ` */`,
    `export type Filters = {`,
    ...serverFilterDefinitionEntries.map(
      ([name]) => `  '${name}': typeof _${name.split(':').map(camelCase).join('_')}Filter,`,
    ),
    `}`,
    ``,
    `/**`,
    ` * Stores all loaded server-side actions in a key-value structure.`,
    ` * The keys represent action names, and their values are arrays of objects containing the following properties:`,
    ` *`,
    ` * - \`callback\` - The action function to be executed.`,
    ` * - \`priority\` - The priority of the action.`,
    ` */`,
    `export const actions: Record<string, { callback: Function, priority: number }[]> = {}`,
    ``,
    `/**`,
    ` * Stores all loaded server-side filters in a key-value structure.`,
    ` * The keys represent filter names, and their values are arrays of objects containing the following properties:`,
    ` *`,
    ` * - \`callback\` - The filter function to be executed.`,
    ` * - \`priority\` - The priority of the filter.`,
    ` */`,
    `export const filters: Record<string, { callback: Function, priority: number }[]> = {}`,
    ``,
    `/**`,
    ` * Loads all server-side actions.`,
    ` *`,
    ` * Actions are functions that allow you to hook into specific points in the application flow.`,
    ` * They provide a way to execute custom code without changing the original implementation.`,
    ` *`,
    ` * This function is called automatically when the server starts.`,
    ` */`,
    `export async function loadActions() {`,
    ...serverActionCallbackEntries.flatMap(([_, locations]) =>
      locations.map(({ file }) => `  await import('${file.import}')`),
    ),
    `}`,
    ``,
    `/**`,
    ` * Loads all server-side filters.`,
    ` *`,
    ` * Filters are functions that allow modification of data at specific points in the application flow.`,
    ` * They provide a way to transform data without changing the original implementation.`,
    ` *`,
    ` * This function is called automatically when the server starts.`,
    ` */`,
    `export async function loadFilters() {`,
    ...serverFilterCallbackEntries.flatMap(([_, locations]) =>
      locations.map(({ file }) => `  await import('${file.import}')`),
    ),
    `}`,
  ].join('\n')
}
