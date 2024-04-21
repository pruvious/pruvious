import {
  supportedLanguages,
  type CollectionName,
  type MultiCollectionName,
  type SingleCollectionName,
  type SupportedLanguage,
  type UploadsCollectionName,
} from '#pruvious'
import { collections, fields } from '#pruvious/server'
import { defineEventHandler, getQuery, getRouterParam, setResponseStatus, type HTTPMethod } from 'h3'
import { readInputData } from '../collections/input'
import { query as _query } from '../collections/query'
import { getQueryStringParams } from '../collections/query-string'
import {
  applyHooksAfterCreate,
  applyHooksAfterDelete,
  applyHooksAfterRead,
  applyHooksAfterUpdate,
  applyHooksBeforeCreate,
  applyHooksBeforeDelete,
  applyHooksBeforeRead,
  applyHooksBeforeReturnRecord,
  applyHooksBeforeUpdate,
} from '../hooks/hook.utils'
import { isArray, toArray } from '../utils/array'
import { isDefined, isNull } from '../utils/common'
import { isFunction } from '../utils/function'
import { isPositiveInteger } from '../utils/number'
import { deepClone, objectPick } from '../utils/object'
import { _, __ } from '../utils/server/translate-string'
import { isString } from '../utils/string'
import { getCapabilities, hasCapability } from '../utils/users'

export default defineEventHandler(async (event) => {
  /*
  |--------------------------------------------------------------------------
  | Resolve user
  |--------------------------------------------------------------------------
  |
  */
  const user = event.context.auth.user

  /*
  |--------------------------------------------------------------------------
  | Parse request data
  |--------------------------------------------------------------------------
  |
  */
  const subPaths = getRouterParam(event, '_')?.split('/') ?? []
  const collection: CollectionName | null | undefined = subPaths[0] ? (collections as any)[subPaths[0]]?.name : null
  const id =
    subPaths[1] && collection && collections[collection]?.mode === 'multi' && (+subPaths[1]).toString() === subPaths[1]
      ? +subPaths[1]
      : null

  if (!collection || !collections[collection]) {
    setResponseStatus(event, 404)
    return __(event, 'pruvious-server', 'Resource not found')
  }

  const mode = collections[collection].mode

  if (mode === 'multi' && subPaths.length >= 2) {
    if (subPaths.length === 2 && subPaths[1] === 'validate' && (event.method === 'POST' || event.method === 'PATCH')) {
      /*
      |--------------------------------------------------------------------------
      | Validate multi-entry collection
      |--------------------------------------------------------------------------
      |
      */
      const capabilities = getCapabilities(user)

      if (!user) {
        setResponseStatus(event, 401)
        return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
      } else if (
        !user.isAdmin &&
        !capabilities[`collection-${collection as MultiCollectionName}-create`] &&
        !capabilities[`collection-${collection as MultiCollectionName}-update`]
      ) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'validate'),
          record: __(event, 'pruvious-server', collections[collection].label.collection.plural as any),
        })
      }

      const input = await readInputData(event, collection)

      if (input?.errors.length) {
        setResponseStatus(event, 400)
        return input.errors.join('\n')
      }

      const errors = await _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).validate(input.data, event.method === 'POST' ? 'create' : 'update')

      if (Object.keys(errors).length) {
        setResponseStatus(event, 422)
        return errors
      }

      setResponseStatus(event, 204)
      return ''
    } else if (
      subPaths.length === 3 &&
      subPaths[2] === 'duplicate' &&
      id &&
      event.method === 'POST' &&
      collections[collection].duplicate
    ) {
      /*
      |--------------------------------------------------------------------------
      | Duplicate record
      |--------------------------------------------------------------------------
      |
      */
      const original = await _query(collection as MultiCollectionName & UploadsCollectionName, event.context.language)
        .where('id', id)
        .first()

      if (!original) {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }

      const duplicate = await (collections[collection].duplicate as any)({ record: original, query: _query })
      const qs = getQueryStringParams(event, collection)

      if (qs.errors.length) {
        setResponseStatus(event, 400)
        return qs.errors.join('\n')
      }

      if (!user) {
        setResponseStatus(event, 401)
        return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
      } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-create`)) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'create'),
          record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
        })
      }

      const params = objectPick(qs.params, ['select', 'order', 'populate'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(params as any)

      if (!user.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onCreate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                input: duplicate,
                language: event.context.language,
                operation: 'create',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onCreate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: duplicate,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'create',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: duplicate[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeCreate(collection as MultiCollectionName, {
        input: duplicate,
        currentQuery: query as any,
        query: _query,
        user,
      })
      const result = await query.create(duplicate)

      if (result.success) {
        removeProtectedFields(collection, result.record)
        await applyHooksAfterCreate(collection as MultiCollectionName, {
          query: _query,
          record: result.record as any,
          recordId: result.record.id!,
          user,
        })
        if (!idSelected) delete result.record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.record as any, user })
        return result.record
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    } else if (
      subPaths.length === 3 &&
      subPaths[2] === 'mirror' &&
      id &&
      event.method === 'POST' &&
      collections[collection].translatable
    ) {
      /*
      |--------------------------------------------------------------------------
      | Mirror multi-entry record translation
      |--------------------------------------------------------------------------
      |
      */
      if (!user) {
        setResponseStatus(event, 401)
        return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
      } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-read`)) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'read'),
          record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
        })
      }

      const from = await _query(collection as MultiCollectionName & UploadsCollectionName, event.context.language)
        .where('id', id)
        .first()

      if (!from) {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }

      const qs = getQueryStringParams(event, collection)
      const _qs = getQuery(event)
      const language = _qs.to && isString(_qs.to) ? _qs.to : null

      if (qs.errors.length) {
        setResponseStatus(event, 400)
        return qs.errors.join('\n')
      } else if (!language) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', "Missing 'to' parameter")
      } else if (!supportedLanguages.includes(language as SupportedLanguage)) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', "The language code '$language' is not supported", { language })
      } else if (from.language === language) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', 'Source and target language cannot be the same')
      }

      const to = await _query(collection as MultiCollectionName & UploadsCollectionName, event.context.language)
        .where('translations', from.translations)
        .where('language', language)
        .first()

      const translation = await collections[collection].mirrorTranslation({
        from,
        to,
        language: language as any,
        query: _query,
      })

      if (to) {
        if (!user.isAdmin && !hasCapability(user, `collection-${collection}-update`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'update'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }

        const params = objectPick(qs.params, ['select', 'order', 'populate'])
        const idSelected = params.select.includes('id')

        if (!idSelected) {
          params.select.push('id')
        }

        const query = (_query(collection as MultiCollectionName & UploadsCollectionName, event.context.language) as any)
          .applyQueryStringParams(params)
          .where('id', to.id)

        if (!user.isAdmin) {
          const cache: Record<string, any> = {}
          const fieldGuardErrors: Record<string, string> = {}

          for (const guard of collections[collection].guards) {
            if (isFunction(guard) || guard.onUpdate) {
              try {
                await (isFunction(guard) ? guard : guard.guard)({
                  _,
                  __,
                  cache,
                  definition: collections[collection],
                  input: translation,
                  language: event.context.language,
                  operation: 'update',
                  currentQuery: query as any,
                  query: _query,
                  user,
                })
              } catch (e: any) {
                setResponseStatus(event, 403)
                return e.message
              }
            }
          }

          for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
            if (isDefined(translation[fieldName]) && field.additional?.guards) {
              for (const guard of field.additional.guards) {
                if (isFunction(guard) || guard.onUpdate) {
                  try {
                    await (isFunction(guard) ? guard : guard.guard)({
                      _,
                      __,
                      cache,
                      definition: fields[field.type],
                      fields,
                      input: translation,
                      language: event.context.language,
                      name: fieldName,
                      operation: 'update',
                      options: collections[collection].fields[fieldName].options,
                      currentQuery: query as any,
                      query: _query,
                      user,
                      value: translation[fieldName],
                    })
                  } catch (e: any) {
                    fieldGuardErrors[fieldName] = e.message
                  }
                }
              }
            }
          }

          if (Object.keys(fieldGuardErrors).length) {
            setResponseStatus(event, 403)
            return fieldGuardErrors
          }
        }

        await applyHooksBeforeUpdate(collection, {
          input: translation,
          currentQuery: query as any,
          query: _query,
          user,
        })
        const result = await query.update(translation as any)

        if (result.success && result.records.length) {
          removeProtectedFields(collection, result.records)
          await applyHooksAfterUpdate(collection, {
            query: _query,
            record: result.records[0],
            recordId: result.records[0].id,
            user,
          })
          if (!idSelected) delete result.records[0].id
          await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.records[0], user })
          return result.records[0]
        } else if (result.success) {
          setResponseStatus(event, 404)
          return __(event, 'pruvious-server', 'Resource not found')
        } else if (result.message) {
          setResponseStatus(event, 400)
          return result.message
        } else {
          setResponseStatus(event, 422)
          return result.errors
        }
      } else {
        if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-create`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'create'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }

        const params = objectPick(qs.params, ['select', 'order', 'populate'])
        const idSelected = params.select.includes('id')

        if (!idSelected) {
          params.select.push('id')
        }

        const query = _query(
          collection as MultiCollectionName & UploadsCollectionName,
          event.context.language,
        ).applyQueryStringParams(params as any)

        if (!user.isAdmin) {
          const cache: Record<string, any> = {}
          const fieldGuardErrors: Record<string, string> = {}

          for (const guard of collections[collection].guards) {
            if (isFunction(guard) || guard.onCreate) {
              try {
                await (isFunction(guard) ? guard : guard.guard)({
                  _,
                  __,
                  cache,
                  definition: collections[collection],
                  input: translation,
                  language: event.context.language,
                  operation: 'create',
                  currentQuery: query as any,
                  query: _query,
                  user,
                })
              } catch (e: any) {
                setResponseStatus(event, 403)
                return e.message
              }
            }
          }

          for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
            if (field.additional?.guards) {
              for (const guard of field.additional.guards) {
                if (isFunction(guard) || guard.onCreate) {
                  try {
                    await (isFunction(guard) ? guard : guard.guard)({
                      _,
                      __,
                      cache,
                      definition: fields[field.type],
                      fields,
                      input: translation,
                      language: event.context.language,
                      name: fieldName,
                      operation: 'create',
                      options: collections[collection].fields[fieldName].options,
                      currentQuery: query as any,
                      query: _query,
                      user,
                      value: translation[fieldName],
                    })
                  } catch (e: any) {
                    fieldGuardErrors[fieldName] = e.message
                  }
                }
              }
            }
          }

          if (Object.keys(fieldGuardErrors).length) {
            setResponseStatus(event, 403)
            return fieldGuardErrors
          }
        }

        await applyHooksBeforeCreate(collection as MultiCollectionName, {
          input: translation,
          currentQuery: query as any,
          query: _query,
          user,
        })
        const result = await query.create(translation as any)

        if (result.success) {
          removeProtectedFields(collection, result.record)
          await applyHooksAfterCreate(collection as MultiCollectionName, {
            query: _query,
            record: result.record as any,
            recordId: result.record.id!,
            user,
          })
          if (!idSelected) delete result.record.id
          await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.record as any, user })
          return result.record
        } else if (result.message) {
          setResponseStatus(event, 400)
          return result.message
        } else {
          setResponseStatus(event, 422)
          return result.errors
        }
      }
    }
  } else if ((mode as any) === 'single' && subPaths.length > 1) {
    if (subPaths.length === 2 && subPaths[1] === 'validate' && event.method === 'PATCH') {
      /*
      |--------------------------------------------------------------------------
      | Validate single-entry collection
      |--------------------------------------------------------------------------
      |
      */
      if (!user) {
        setResponseStatus(event, 401)
        return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
      } else if (!user.isAdmin && !hasCapability(user, `collection-${collection}-update`)) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'validate'),
          record: __(event, 'pruvious-server', collections[collection].label.collection.plural as any),
        })
      }

      const input = await readInputData(event, collection)

      if (input?.errors.length) {
        setResponseStatus(event, 400)
        return input.errors.join('\n')
      }

      const errors = await _query(collection as SingleCollectionName, event.context.language).validate(
        input.data,
        'update',
      )

      if (Object.keys(errors).length) {
        setResponseStatus(event, 422)
        return errors
      }

      setResponseStatus(event, 204)
      return ''
    } else if (
      subPaths.length === 2 &&
      subPaths[1] === 'mirror' &&
      event.method === 'POST' &&
      collections[collection].translatable
    ) {
      /*
      |--------------------------------------------------------------------------
      | Mirror single-entry record translation
      |--------------------------------------------------------------------------
      |
      */
      if (!user) {
        setResponseStatus(event, 401)
        return __(event, 'pruvious-server', 'Unauthorized due to either invalid credentials or missing authentication')
      } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as SingleCollectionName}-read`)) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'read'),
          record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
        })
      }

      const qs = getQueryStringParams(event, collection)
      const _qs = getQuery(event)
      const fromLanguage = _qs.from && isString(_qs.from) ? _qs.from : null
      const toLanguage = _qs.to && isString(_qs.to) ? _qs.to : null

      if (qs.errors.length) {
        setResponseStatus(event, 400)
        return qs.errors.join('\n')
      } else if (!fromLanguage) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', "Missing 'from' language parameter")
      } else if (!toLanguage) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', "Missing 'to' language parameter")
      } else if (!supportedLanguages.includes(fromLanguage as SupportedLanguage)) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', "The language code '$language' is not supported", {
          language: fromLanguage,
        })
      } else if (!supportedLanguages.includes(toLanguage as SupportedLanguage)) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', `The language code '$language' is not supported`, {
          language: toLanguage,
        })
      } else if (fromLanguage === toLanguage) {
        setResponseStatus(event, 400)
        return __(event, 'pruvious-server', 'Source and target language cannot be the same')
      }

      const from = await _query(collection as SingleCollectionName, event.context.language)
        .language(fromLanguage as any)
        .read()
      const to = await _query(collection as SingleCollectionName, event.context.language)
        .language(toLanguage as any)
        .read()

      if (!from) {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }

      if (!user.isAdmin && !hasCapability(user, `collection-${collection as SingleCollectionName}-update`)) {
        setResponseStatus(event, 403)
        return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
          operate: __(event, 'pruvious-server', 'update'),
          record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
        })
      }

      const translation = await collections[collection].mirrorTranslation({
        from,
        to,
        language: toLanguage as any,
        query: _query,
      })

      const params = { ...objectPick(qs.params, ['select', 'populate']), language: toLanguage }
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = (_query(collection as SingleCollectionName, event.context.language) as any).applyQueryStringParams(
        params,
      )

      if (!user.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onUpdate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                input: translation,
                language: event.context.language,
                operation: 'update',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (isDefined(translation[fieldName]) && field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onUpdate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: translation,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'update',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: translation[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeUpdate(collection, { input: translation, currentQuery: query as any, query: _query, user })
      const result = await query.update(translation)

      if (result.success) {
        removeProtectedFields(collection, result.record)
        await applyHooksAfterUpdate(collection, {
          query: _query,
          record: result.record,
          recordId: result.record.id,
          user,
        })
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.record, user })
        if (!idSelected) delete result.record.id
        return result.record
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Multi-entry collection
  |--------------------------------------------------------------------------
  |
  */
  if (mode === 'multi') {
    const idExists = !!(id
      ? await (_query(collection as MultiCollectionName & UploadsCollectionName, event.context.language) as any)
          .where('id', id)
          .count()
      : 0)

    if ((id && !idExists) || (id && subPaths.length > 2) || (!id && subPaths.length > 1)) {
      setResponseStatus(event, 404)
      return __(event, 'pruvious-server', 'Resource not found')
    }

    const method = event.method
    const input = method === 'POST' || method === 'PATCH' ? await readInputData(event, collection) : null

    if (input?.errors.length) {
      setResponseStatus(event, 400)
      return input.errors.join('\n')
    }

    const operation = resolveOperation(method, id, input?.data)

    if (!operation) {
      setResponseStatus(event, 405)
      return __(event, 'pruvious-server', 'This method is not supported')
    }

    const qs = getQueryStringParams(event, collection)

    if (qs.errors.length) {
      setResponseStatus(event, 400)
      return qs.errors.join('\n')
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve create request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'create' && collections[collection].apiRoutes.create) {
      if (collections[collection].apiRoutes.create === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-create`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'create'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'order', 'populate'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(params as any)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onCreate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                input: input!.data,
                language: event.context.language,
                operation: 'create',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onCreate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: input!.data,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'create',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: (input!.data as any)[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeCreate(collection as MultiCollectionName, {
        input: input!.data,
        currentQuery: query as any,
        query: _query,
        user,
      })
      const result = await query.create(input!.data as any)

      if (result.success) {
        removeProtectedFields(collection, result.record)
        await applyHooksAfterCreate(collection as MultiCollectionName, {
          query: _query,
          record: result.record as any,
          recordId: result.record.id!,
          user,
        })
        if (!idSelected) delete result.record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.record as any, user })
        return result.record
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve create many request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'createMany' && collections[collection].apiRoutes.createMany) {
      if (collections[collection].apiRoutes.createMany === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (
          !user.isAdmin &&
          !hasCapability(user, `collection-${collection as MultiCollectionName}-create-many`)
        ) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'create'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'order', 'populate'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(params as any)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: (Record<string, string> | null)[] = []

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onCreate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                allInputs: input!.data as any[],
                language: event.context.language,
                operation: 'create',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const entry of input!.data as any[]) {
          const errors: Record<string, string> = {}

          for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
            if (field.additional?.guards) {
              for (const guard of field.additional.guards) {
                if (isFunction(guard) || guard.onCreate) {
                  try {
                    await (isFunction(guard) ? guard : guard.guard)({
                      _,
                      __,
                      cache,
                      definition: fields[field.type],
                      fields,
                      input: entry,
                      allInputs: input!.data as any[],
                      language: event.context.language,
                      name: fieldName,
                      operation: 'create',
                      options: collections[collection].fields[fieldName].options,
                      currentQuery: query as any,
                      query: _query,
                      user,
                      value: entry[fieldName],
                    })
                  } catch (e: any) {
                    errors[fieldName] = e.message
                  }
                }
              }
            }
          }

          fieldGuardErrors.push(Object.keys(errors).length ? errors : null)
        }

        if (fieldGuardErrors.some(Boolean)) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      for (const entry of input!.data as any[]) {
        await applyHooksBeforeCreate(collection as MultiCollectionName, {
          input: entry,
          currentQuery: query as any,
          query: _query,
          user,
        })
      }

      const result = await query.createMany(input!.data as any[])

      if (result.success) {
        for (const record of result.records) {
          removeProtectedFields(collection, result.records)
          await applyHooksAfterCreate(collection as MultiCollectionName, {
            query: _query,
            record: record as any,
            recordId: record.id!,
            user,
          })
          if (!idSelected) delete record.id
          await applyHooksBeforeReturnRecord(collection, { query: _query, record: record as any, user })
        }

        return result.records
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve read request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'read' && collections[collection].apiRoutes.read) {
      if (collections[collection].apiRoutes.read === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection}-read`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'read'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const query = (_query(collection as MultiCollectionName & UploadsCollectionName, event.context.language) as any)
        .applyQueryStringParams(objectPick(qs.params, ['select', 'populate']))
        .where('id', id)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onRead) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                operation: 'read',
                currentQuery: query as any,
                language: event.context.language,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }
      }

      await applyHooksBeforeRead(collection, { currentQuery: query as any, query: _query, user })
      const record = await query.first()

      if (record) {
        removeProtectedFields(collection, record)
        await applyHooksAfterRead(collection, { query: _query, record, recordId: id!, user })
        await applyHooksBeforeReturnRecord(collection, { query: _query, record, user })
        return record
      } else {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve read many request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'readMany' && collections[collection].apiRoutes.readMany) {
      if (collections[collection].apiRoutes.readMany === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-read-many`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'read'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const params = deepClone(qs.params)
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(qs.params as any)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onRead) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                operation: 'read',
                currentQuery: query as any,
                language: event.context.language,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }
      }

      await applyHooksBeforeRead(collection, { currentQuery: query as any, query: _query, user })
      const { count, records } = await query.allWithCount()
      const offset = qs.params.offset ?? 0
      const perPage = qs.params.limit ?? count
      const page = perPage ? offset / perPage + 1 : 1
      const lastPage = perPage ? Math.max(1, Math.ceil(count / perPage)) : 1

      for (const record of records) {
        removeProtectedFields(collection, record)
        await applyHooksAfterRead(collection, { query: _query, record: record as any, recordId: record.id!, user })
        if (!idSelected) delete record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: record as any, user })
      }

      return { currentPage: isPositiveInteger(page) ? page : null, lastPage, perPage, records, total: count }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve update request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'update' && collections[collection].apiRoutes.update) {
      if (collections[collection].apiRoutes.update === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection}-update`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'update'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const query = (_query(collection as MultiCollectionName & UploadsCollectionName, event.context.language) as any)
        .applyQueryStringParams(objectPick(qs.params, ['select', 'order', 'populate']))
        .where('id', id)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onUpdate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                input: input!.data,
                language: event.context.language,
                operation: 'update',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (isDefined((input!.data as any)[fieldName]) && field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onUpdate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: input!.data,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'update',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: (input!.data as any)[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeUpdate(collection, { input: input!.data, currentQuery: query as any, query: _query, user })
      const result = await query.update(input!.data as any)

      if (result.success && result.records.length) {
        removeProtectedFields(collection, result.records)
        await applyHooksAfterUpdate(collection, { query: _query, record: result.records[0], recordId: id!, user })
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.records[0], user })
        return result.records[0]
      } else if (result.success) {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve update many request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'updateMany' && collections[collection].apiRoutes.updateMany) {
      if (collections[collection].apiRoutes.updateMany === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (
          !user.isAdmin &&
          !hasCapability(user, `collection-${collection as MultiCollectionName}-update-many`)
        ) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'update'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'order', 'populate', 'where'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(params as any)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onUpdate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                input: input!.data,
                language: event.context.language,
                operation: 'update',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (isDefined((input!.data as any)[fieldName]) && field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onUpdate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: input!.data,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'update',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: (input!.data as any)[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeUpdate(collection, { input: input!.data, currentQuery: query as any, query: _query, user })
      const result = await query.update(input!.data as any)

      if (result.success) {
        for (const record of result.records) {
          removeProtectedFields(collection, result.records)
          await applyHooksAfterUpdate(collection, { query: _query, record: record as any, recordId: record.id!, user })
          if (!idSelected) delete record.id
          await applyHooksBeforeReturnRecord(collection, { query: _query, record: record as any, user })
        }

        return result.records
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve delete request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'delete' && collections[collection].apiRoutes.delete) {
      if (collections[collection].apiRoutes.delete === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection as MultiCollectionName}-delete`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'delete'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const query = (_query(collection as MultiCollectionName & UploadsCollectionName, event.context.language) as any)
        .applyQueryStringParams(objectPick(qs.params, ['select', 'order', 'populate']))
        .where('id', id)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onDelete) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                language: event.context.language,
                operation: 'delete',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }
      }

      await applyHooksBeforeDelete(collection as MultiCollectionName, {
        currentQuery: query as any,
        query: _query,
        user,
      })
      const records = await query.delete()

      if (records.length) {
        removeProtectedFields(collection, records)
        await applyHooksAfterDelete(collection as MultiCollectionName, {
          query: _query,
          record: records[0],
          recordId: id!,
          user,
        })
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: records[0], user })
        return records[0]
      } else {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve delete many request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'deleteMany' && collections[collection].apiRoutes.deleteMany) {
      if (collections[collection].apiRoutes.deleteMany === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (
          !user.isAdmin &&
          !hasCapability(user, `collection-${collection as MultiCollectionName}-delete-many`)
        ) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'delete'),
            record: __(event, 'pruvious-server', collections[collection].label.record.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'order', 'populate', 'where'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = _query(
        collection as MultiCollectionName & UploadsCollectionName,
        event.context.language,
      ).applyQueryStringParams(params as any)

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onDelete) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                language: event.context.language,
                operation: 'delete',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }
      }

      await applyHooksBeforeDelete(collection as MultiCollectionName, {
        currentQuery: query as any,
        query: _query,
        user,
      })
      const records = await query.delete()

      for (const record of records) {
        removeProtectedFields(collection, record)
        await applyHooksAfterDelete(collection as MultiCollectionName, {
          query: _query,
          record: record as any,
          recordId: record.id!,
          user,
        })
        if (!idSelected) delete record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: record as any, user })
      }

      return records
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Single-entry collection
  |--------------------------------------------------------------------------
  |
  */
  if ((mode as any) === 'single') {
    if (subPaths.length > 1) {
      setResponseStatus(event, 404)
      return __(event, 'pruvious-server', 'Resource not found')
    }

    const method = event.method
    const operation = method === 'GET' ? 'read' : method === 'PATCH' ? 'update' : null
    const input = operation === 'update' ? await readInputData(event, collection) : null

    if (input?.errors.length) {
      setResponseStatus(event, 400)
      return input.errors.join('\n')
    }

    if (!operation) {
      setResponseStatus(event, 405)
      return __(event, 'pruvious-server', 'This method is not supported')
    }

    const qs = getQueryStringParams(event, collection)

    if (qs.errors.length) {
      setResponseStatus(event, 400)
      return qs.errors.join('\n')
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve read request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'read' && collections[collection].apiRoutes.read) {
      if (collections[collection].apiRoutes.read === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection}-read`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'read'),
            record: __(event, 'pruvious-server', collections[collection].label.collection.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'language', 'populate'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = (_query(collection as SingleCollectionName, event.context.language) as any).applyQueryStringParams(
        params,
      )

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onRead) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                language: event.context.language,
                operation: 'read',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }
      }

      await applyHooksBeforeRead(collection, { currentQuery: query as any, query: _query, user })
      const record = await query.read()

      if (record) {
        removeProtectedFields(collection, record)
        await applyHooksAfterRead(collection, { query: _query, record, recordId: record.id, user })
        if (!idSelected) delete record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record, user })
        return record
      } else {
        setResponseStatus(event, 404)
        return __(event, 'pruvious-server', 'Resource not found')
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve update request
    |--------------------------------------------------------------------------
    |
    */
    if (operation === 'update' && collections[collection].apiRoutes.update) {
      if (collections[collection].apiRoutes.update === 'private') {
        if (!user) {
          setResponseStatus(event, 401)
          return __(
            event,
            'pruvious-server',
            'Unauthorized due to either invalid credentials or missing authentication',
          )
        } else if (!user.isAdmin && !hasCapability(user, `collection-${collection}-update`)) {
          setResponseStatus(event, 403)
          return __(event, 'pruvious-server', "You don't have the necessary permissions to $operate $record", {
            operate: __(event, 'pruvious-server', 'update'),
            record: __(event, 'pruvious-server', collections[collection].label.collection.plural as any),
          })
        }
      }

      const params = objectPick(qs.params, ['select', 'language', 'populate'])
      const idSelected = params.select.includes('id')

      if (!idSelected) {
        params.select.push('id')
      }

      const query = (_query(collection as SingleCollectionName, event.context.language) as any).applyQueryStringParams(
        params,
      )

      if (!user?.isAdmin) {
        const cache: Record<string, any> = {}
        const fieldGuardErrors: Record<string, string> = {}

        for (const guard of collections[collection].guards) {
          if (isFunction(guard) || guard.onUpdate) {
            try {
              await (isFunction(guard) ? guard : guard.guard)({
                _,
                __,
                cache,
                definition: collections[collection],
                language: event.context.language,
                input: input!.data,
                operation: 'update',
                currentQuery: query as any,
                query: _query,
                user,
              })
            } catch (e: any) {
              setResponseStatus(event, 403)
              return e.message
            }
          }
        }

        for (const [fieldName, field] of Object.entries(collections[collection].fields)) {
          if (isDefined((input!.data as any)[fieldName]) && field.additional?.guards) {
            for (const guard of field.additional.guards) {
              if (isFunction(guard) || guard.onUpdate) {
                try {
                  await (isFunction(guard) ? guard : guard.guard)({
                    _,
                    __,
                    cache,
                    definition: fields[field.type],
                    fields,
                    input: input!.data,
                    language: event.context.language,
                    name: fieldName,
                    operation: 'update',
                    options: collections[collection].fields[fieldName].options,
                    currentQuery: query as any,
                    query: _query,
                    user,
                    value: (input!.data as any)[fieldName],
                  })
                } catch (e: any) {
                  fieldGuardErrors[fieldName] = e.message
                }
              }
            }
          }
        }

        if (Object.keys(fieldGuardErrors).length) {
          setResponseStatus(event, 403)
          return fieldGuardErrors
        }
      }

      await applyHooksBeforeUpdate(collection, { input: input!.data, currentQuery: query as any, query: _query, user })
      const result = await query.update(input!.data as any)

      if (result.success) {
        removeProtectedFields(collection, result.record)
        await applyHooksAfterUpdate(collection, {
          query: _query,
          record: result.record,
          recordId: result.record.id,
          user,
        })
        if (!idSelected) delete result.record.id
        await applyHooksBeforeReturnRecord(collection, { query: _query, record: result.record, user })
        return result.record
      } else if (result.message) {
        setResponseStatus(event, 400)
        return result.message
      } else {
        setResponseStatus(event, 422)
        return result.errors
      }
    }
  }

  setResponseStatus(event, 404)
  return __(event, 'pruvious-server', 'Resource not found')
})

function resolveOperation(method: HTTPMethod, id: number | null, input: any) {
  if (method === 'POST' && isNull(id)) {
    return isArray(input) ? 'createMany' : 'create'
  } else if (method === 'GET') {
    return id ? 'read' : 'readMany'
  } else if (method === 'PATCH') {
    return id ? 'update' : 'updateMany'
  } else if (method === 'DELETE') {
    return id ? 'delete' : 'deleteMany'
  }
}

function removeProtectedFields(collection: CollectionName, records: Record<string, any> | Record<string, any>[]) {
  for (const record of toArray(records)) {
    for (const fieldName of Object.keys(record)) {
      if (collections[collection].fields[fieldName].additional?.protected) {
        delete record[fieldName]
      }
    }
  }
}
