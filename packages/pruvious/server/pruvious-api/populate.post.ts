import {
  __,
  collections,
  database,
  getRouteReferences,
  parseBody,
  parseFields,
  pruviousError,
  selectFrom,
  selectSingleton,
  singletons,
  type Collections,
  type Singletons,
} from '#pruvious/server'
import { SelectContext, type Populator } from '@pruvious/orm'
import { dotNotationsToObject, isObject, isString, isUndefined } from '@pruvious/utils'

export default defineEventHandler(async (event) => {
  const routeReferences = await getRouteReferences()
  const { ref, data } = await parseBody(event, 'object').then(({ input }) => input)

  if (isUndefined(ref)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is required', { param: 'ref' }),
    })
  } else if (!isString(ref)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'ref' }),
    })
  } else if (!routeReferences[ref]) {
    throw pruviousError(event, {
      statusCode: 404,
      message: __('pruvious-api', 'Route reference not found'),
    })
  }

  if (isUndefined(data)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is required', { param: 'data' }),
    })
  } else if (!isObject(data)) {
    throw pruviousError(event, {
      statusCode: 400,
      message: __('pruvious-api', 'The `$param` parameter is invalid', { param: 'data' }),
    })
  }

  const populatedData: Record<string, any> = {}
  const promises: Promise<any>[] = []
  const { dataContainerType, dataContainerName } = routeReferences[ref]
  const context = new SelectContext({
    queryBuilder: (dataContainerType === 'collection'
      ? selectFrom(dataContainerName as keyof Collections)
      : selectSingleton(dataContainerName as keyof Singletons)) as any,
    collection: (dataContainerType === 'collection'
      ? collections[dataContainerName as keyof Collections]
      : undefined) as any,
    collectionName: dataContainerType === 'collection' ? dataContainerName : undefined,
    database: database() as any,
    cache: {},
    whereCondition: [],
    language: event.context.pruvious.language,
    customData: {},
  })
  const fields =
    dataContainerType === 'collection'
      ? collections[dataContainerName as keyof Collections].fields
      : singletons[dataContainerName as keyof Singletons].fields
  const parsedFields = parseFields(fields, dotNotationsToObject(data))

  if (dataContainerType === 'singleton') {
    Object.assign(context, {
      singleton: singletons[dataContainerName as keyof Singletons],
      singletonName: singletons[dataContainerName as keyof Singletons],
    })
  }

  for (const [path, value] of Object.entries(data)) {
    const field = parsedFields[path]
    if (field) {
      const populator: Populator<any, any> | undefined = field.model.populator
      if (populator) {
        promises.push(
          new Promise<void>(async (resolve) => {
            populatedData[path] = await populator(value, field.withContext(context, { path }))
            resolve()
          }),
        )
      } else {
        populatedData[path] = value
      }
    }
  }

  await Promise.all(promises)

  return populatedData
})
