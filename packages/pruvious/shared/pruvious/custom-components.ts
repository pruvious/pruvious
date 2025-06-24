import { resolveNamedPruviousComponent } from '#pruvious/server'

export const customComponents = {
  PathField: resolveNamedPruviousComponent('PathField', '@/components/Pruvious/Dashboard/PathField.vue'),
  PathFieldTable: resolveNamedPruviousComponent(
    'PathField.table',
    '@/components/Pruvious/Dashboard/PathField.table.vue',
  ),
  PathFieldFilter: resolveNamedPruviousComponent(
    'PathField.filter',
    '@/components/Pruvious/Dashboard/PathField.filter.vue',
  ),
  RedirectCodeField: resolveNamedPruviousComponent(
    'RedirectCodeField',
    '@/components/Pruvious/Dashboard/RedirectCodeField.vue',
  ),
  RouteTranslationsColumn: resolveNamedPruviousComponent(
    'RouteTranslationsColumn',
    '@/components/Pruvious/Dashboard/RouteTranslationsColumn.vue',
  ),
}
