import type { GenericRouteReference, GenericSerializableFieldOptions } from '#pruvious/server'
import { pick, remap } from '@pruvious/utils'
import { usePruviousDashboard } from '../pruvious/utils.client'

/**
 * Retrieves all collections and singletons that can be referenced in routes.
 */
export function getRouteReferences(): Record<
  string,
  Omit<GenericRouteReference, 'publicFields'> & {
    /**
     * A key-value object of `Field` instances representing the `routing.publicFields` of the collection or singleton.
     */
    publicFields: Record<string, GenericSerializableFieldOptions>
  }
> {
  const dashboard = usePruviousDashboard()
  const routedCollections = Object.fromEntries(
    Object.entries(dashboard.value?.collections ?? {})
      .filter(([_, collection]) => collection.routing.enabled)
      .map(([name, collection]) => [
        name,
        {
          fields: collection.fields,
          routing: collection.routing,
          dataContainerType: 'collection',
          dataContainerName: name,
        },
      ]),
  )
  const routedSingletons = Object.fromEntries(
    Object.entries(dashboard.value?.singletons ?? {})
      .filter(([_, singleton]) => singleton.routing.enabled)
      .map(([name, singleton]) => [
        name,
        {
          fields: singleton.fields,
          routing: singleton.routing,
          dataContainerType: 'singleton',
          dataContainerName: name,
        },
      ]),
  )
  const routedContainers: Record<string, any> = { ...routedCollections }

  for (const [name, singleton] of Object.entries(routedSingletons)) {
    const ref = routedContainers[name] ? `${name}:Singleton` : name
    routedContainers[ref] = singleton
  }

  return remap(routedContainers, (ref, { fields, routing, dataContainerType, dataContainerName }) => [
    ref,
    {
      publicFields: pick(fields, routing.publicFields),
      dataContainerType,
      dataContainerName,
      layout: routing.layout,
    },
  ])
}
