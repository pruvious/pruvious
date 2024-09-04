import { resolveAppPath, resolveModulePath } from '../instances/path'
import { CodeGenerator } from '../utils/code-generator'
import { relativeDotPruviousImport, relativeImport } from '../utils/fs'
import { slugify } from '../utils/slugify'
import { camelCase } from '../utils/string'
import type { ResolvedDashboardPage } from './dashboard.resolver'

export function generateDashboardPages(
  dashboardPages: Record<string, ResolvedDashboardPage>,
  ts: CodeGenerator,
  tsServer: CodeGenerator,
  tsDashboard: CodeGenerator,
) {
  const dashboardPagesArray = Object.values(dashboardPages)
  const dotPruviousPath = resolveAppPath('./.pruvious')

  /*
  |--------------------------------------------------------------------------
  | re-export
  |--------------------------------------------------------------------------
  |
  */
  const definitionPath = resolveModulePath('./runtime/dashboard/dashboard.definition')
  ts.newDecl(
    `import type { DashboardPageDefinition, ResolvedDashboardPageDefinition } from '${relativeImport(
      dotPruviousPath,
      definitionPath,
    )}'`,
  ).newLine('export { type DashboardPageDefinition, type ResolvedDashboardPageDefinition }')

  ts.newLine(`import { defineDashboardPage } from '${relativeImport(dotPruviousPath, definitionPath)}'`).newLine(
    'export { defineDashboardPage }',
  )

  /*
    |--------------------------------------------------------------------------
    | dashboardPageComponentImports
    |--------------------------------------------------------------------------
    |
    */
  tsDashboard.newDecl(`export const dashboardPageComponentImports = {`)
  for (const { definition, source } of dashboardPagesArray) {
    tsDashboard.newLine(
      `'${definition.path}': () => import('${relativeDotPruviousImport(resolveAppPath(definition.vueComponent))}'),`,
    )
  }
  tsDashboard.newLine(`}`)

  /*
  |--------------------------------------------------------------------------
  | dashboardPages
  |--------------------------------------------------------------------------
  |
  */
  for (const { definition, source } of dashboardPagesArray) {
    const from = relativeImport(dotPruviousPath, source)
    tsServer.newDecl(
      `import { default as ${camelCase(slugify(definition.path))}DashboardPageDefinition } from '${from}'`,
    )
    tsServer.newLine(`export { ${camelCase(slugify(definition.path))}DashboardPageDefinition }`)
  }

  tsServer.newDecl('export const dashboardPages = {')
  for (const { definition } of dashboardPagesArray) {
    tsServer.newLine(`'${definition.path}': ${camelCase(slugify(definition.path))}DashboardPageDefinition,`)
  }
  tsServer.newLine('}')
}
