import { useRuntimeConfig } from '#imports'
import type { BlockName, CollectionName, ResolvedCollectionDefinition } from '#pruvious'
import { blocks } from '#pruvious/blocks'
import { dashboardIcons } from '#pruvious/dashboard-icons'
import { collections as _collections, dashboardPages, fields } from '#pruvious/server'
import { defineEventHandler } from 'h3'
import { isProduction } from 'std-env'
import { resolveCollectionFieldOptions } from '../collections/field-options.resolver'
import type { BlockMeta, DashboardCollectionFields, PruviousDashboard } from '../composables/dashboard/dashboard'
import { cache } from '../instances/cache'
import { getModuleOption } from '../instances/state'
import { sortNaturalByProp } from '../utils/array'
import { __ } from '../utils/server/translate-string'
import { capitalize, joinRouteParts } from '../utils/string'
import { getCapabilities } from '../utils/users'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const userCapabilities = getCapabilities(event.context.auth.user)
  const canAccessDashboard =
    event.context.auth.isLoggedIn && (event.context.auth.user.isAdmin || userCapabilities['access-dashboard'])
  const collections: Record<
    string,
    Pick<
      ResolvedCollectionDefinition,
      'apiRoutes' | 'contentBuilder' | 'label' | 'mode' | 'name' | 'publicPages' | 'translatable'
    > & {
      canDuplicate: boolean
      dashboard: Omit<ResolvedCollectionDefinition['dashboard'], 'icon'> & {
        icon: string
      }
      fields: DashboardCollectionFields
      search: boolean
    }
  > = {}

  for (const [collectionName, definition] of Object.entries(_collections)) {
    if (
      definition.apiRoutes.readMany &&
      canAccessDashboard &&
      (event.context.auth.user?.isAdmin ||
        (userCapabilities as any)[`collection-${collectionName}-read`] ||
        collectionName === 'users')
    ) {
      collections[collectionName] = {
        apiRoutes: definition.apiRoutes,
        canDuplicate: !!definition.duplicate,
        contentBuilder: definition.contentBuilder,
        publicPages: definition.publicPages,
        dashboard: {
          ...definition.dashboard,
          icon: dashboardIcons[definition.dashboard.icon] ?? definition.dashboard.icon,
          visible:
            event.context.auth.user?.isAdmin || (userCapabilities as any)[`collection-${collectionName}-read`]
              ? definition.dashboard.visible
              : false,
        },
        fields: Object.fromEntries(
          Object.entries(definition.fields).map(([fieldName, field]) => {
            const options = resolveCollectionFieldOptions(collectionName, field.type, fieldName, field.options, fields)

            return [
              fieldName,
              {
                default: fields[field.type].default({ definition: fields[field.type], name: fieldName, options }),
                options,
                type: field.type,
                additional: {
                  conditionalLogic: field.additional?.conditionalLogic,
                  emptyLabel: field.additional?.emptyLabel ?? '-',
                  immutable: !!field.additional?.immutable,
                  protected: !!field.additional?.protected,
                  hidden: !!field.additional?.hidden,
                },
              },
            ]
          }),
        ),
        label: definition.label,
        mode: definition.mode,
        name: definition.name,
        search: !!definition.search,
        translatable: definition.translatable,
      }
    }
  }

  const menu: PruviousDashboard['menu'] = Object.values(collections)
    .filter(({ name, dashboard }) => name !== 'uploads' && dashboard.visible)
    .map(({ dashboard, label, mode, name }) => ({
      collection: name as CollectionName,
      icon: dashboard.icon,
      label: __(event, 'pruvious-dashboard', capitalize(label.collection.plural, false) as any),
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'collections', name),
      priority:
        name === 'pages'
          ? 0
          : name === 'presets'
          ? 1
          : name === 'users'
          ? 4
          : name === 'roles'
          ? 5
          : mode === 'multi'
          ? 3
          : 6,
    }))

  if (
    _collections.uploads &&
    canAccessDashboard &&
    (event.context.auth.user?.isAdmin || userCapabilities['collection-uploads-read'])
  ) {
    menu.push({
      icon: dashboardIcons[_collections.uploads.dashboard.icon] ?? _collections.uploads.dashboard.icon,
      collection: 'uploads',
      label: __(event, 'pruvious-dashboard', 'Media'),
      path: joinRouteParts(runtimeConfig.public.pruvious.dashboardPrefix, 'media'),
      priority: 2,
    })
  }

  for (const dashboardPage of Object.values(dashboardPages)) {
    if (
      canAccessDashboard &&
      (event.context.auth.user?.isAdmin ||
        dashboardPage.capabilities.every((capability) => userCapabilities[capability]))
    ) {
      menu.push({
        icon: dashboardIcons[dashboardPage.icon] ?? dashboardPage.icon,
        label: __(event, 'pruvious-dashboard', dashboardPage.label as any),
        path: dashboardPage.path,
        priority: dashboardPage.priority,
      })
    }
  }

  sortNaturalByProp(menu, 'label').sort((a, b) => a.priority - b.priority)

  return {
    blocks: canAccessDashboard
      ? Object.fromEntries(
          Object.values(blocks).map((block) => [
            block.name,
            {
              name: block.name as BlockName,
              label: block.label,
              icon: dashboardIcons[block.icon] ?? block.icon,
              fields: Object.fromEntries(
                Object.entries(block.fields).map(([fieldName, field]) => [
                  fieldName,
                  {
                    type: field.type,
                    options: resolveCollectionFieldOptions(
                      `block:${block.name}`,
                      field.type,
                      fieldName,
                      field.options,
                      fields,
                    ),
                    additional: {
                      hidden: !!field.additional?.hidden,
                    },
                  },
                ]),
              ) as any,
              slots: block.slots,
              description: block.description,
            } satisfies BlockMeta,
          ]),
        )
      : {},
    collections,
    isCacheActive:
      canAccessDashboard && (event.context.auth.user?.isAdmin || userCapabilities['clear-cache'])
        ? (isProduction && !!runtimeConfig.pruvious.pageCache) || !!(await cache())
        : false,
    legalLinks: getModuleOption('dashboard').legalLinks,
    menu,
  }
})
