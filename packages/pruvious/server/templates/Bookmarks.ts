import { collections, defineTemplate, recordField, switchField, textField, type Collections } from '#pruvious/server'
import { isUndefined } from '@pruvious/utils'

export default defineTemplate(() => ({
  fields: {
    name: textField({
      required: true,
    }),
    data: textField({
      required: true,
    }),
    collection: textField({
      required: true,
      validators: [
        (value, { context }) => {
          if (!collections[value as keyof Collections]) {
            throw new Error(context.__('pruvious-api', 'Collection not found'))
          } else if (value === 'Bookmarks') {
            throw new Error(context.__('pruvious-api', 'Invalid input'))
          }
        },
      ],
    }),
    user: recordField({
      collection: 'Users',
      immutable: true,
      inputFilters: {
        beforeInputSanitization: (value, { context }) => {
          if (context.operation === 'insert' && isUndefined(value)) {
            const { isLoggedIn, user } = useEvent().context.pruvious.auth
            return isLoggedIn ? user.id : null
          }

          return value
        },
      },
    }),
    shared: switchField({}),
  },
  indexes: [{ fields: ['collection'] }, { fields: ['user'] }, { fields: ['shared'] }],
  foreignKeys: [{ field: 'user', referencedCollection: 'Users', action: ['ON UPDATE RESTRICT', 'ON DELETE CASCADE'] }],
  hooks: {
    beforeQueryPreparation: [
      ({ operation, queryBuilder }) => {
        const event = useEvent()

        if (event.context.pruvious.auth.isLoggedIn) {
          if (operation === 'select') {
            queryBuilder!.orGroup([
              (eb) => eb.where('user', '=', event.context.pruvious.auth.user!.id),
              (eb) => eb.where('shared', '=', true),
            ])
          } else if (operation === 'update' || operation === 'delete') {
            queryBuilder!.where('user', '=', event.context.pruvious.auth.user.id)
          }
        }
      },
    ],
  },
  ui: { hidden: true },
}))
