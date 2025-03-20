import {
  __,
  dashboardLanguages,
  defineTemplate,
  denyWhere,
  emailValidator,
  hashPassword,
  hasPermission,
  languages,
  maskFields,
  nonEmptyValidator,
  primaryLanguage,
  recordsField,
  resolvePruviousComponent,
  selectField,
  selectFrom,
  textField,
  trueFalseField,
  uniqueValidator,
} from '#pruvious/server'
import type { WhereCondition } from '@pruvious/orm'
import { castToBoolean, generateSecureRandomString, isDefined, isString } from '@pruvious/utils'

export default defineTemplate(() => ({
  fields: {
    email: textField({
      ui: { label: ({ __ }) => __('pruvious-dashboard', 'Email') },
      required: true,
      validators: [
        emailValidator(),
        uniqueValidator(({ __ }) => __('pruvious-api', 'The email address is already in use')),
      ],
    }),
    password: textField({
      required: true,
      validators: [
        (value, { context }) => {
          if (value.length < 8) {
            throw new Error(context.__('pruvious-dashboard', 'The password must be at least 8 characters long'))
          }
        },
      ],
      inputFilters: {
        beforeQueryExecution: (value) => {
          if (isString(value)) {
            return hashPassword(value)
          }
        },
      },
    }),
    tokenSubject: textField({
      inputFilters: {
        beforeQueryExecution: async (value, { context }) => {
          if (context.operation === 'insert' || castToBoolean(value)) {
            while (true) {
              const tokenSubject = generateSecureRandomString()
              const { success, data, runtimeError } = await selectFrom('Users')
                .where('tokenSubject', '=', tokenSubject)
                .withCustomContextData({ __ignoreDenyWhereHook: true })
                .count()

              if (success) {
                if (data === 0) {
                  return tokenSubject
                }
              } else {
                throw new Error(runtimeError)
              }
            }
          }
        },
      },
      ui: { hidden: true },
    }),
    isActive: trueFalseField({
      default: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Status'),
        noLabel: ({ __ }) => __('pruvious-dashboard', 'Inactive'),
        yesLabel: ({ __ }) => __('pruvious-dashboard', 'Active'),
        variant: 'accent',
      },
    }),
    isAdmin: trueFalseField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Administrator'),
        variant: 'accent',
      },
    }),
    roles: recordsField({
      collection: 'Roles',
      fields: ['id', 'name', 'permissions'],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Roles'),
      },
    }),
    firstName: textField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'First name'),
      },
    }),
    lastName: textField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Last name'),
      },
    }),
    contentLanguage: selectField({
      choices: languages.map(({ code, name }) => ({ value: code, label: name })),
      default: primaryLanguage,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Content language'),
        description: ({ __ }) => __('pruvious-dashboard', 'Language used in content entries and pages.'),
      },
    }),
    dashboardLanguage: selectField({
      choices: dashboardLanguages.map(({ code, name }) => ({ value: code, label: name })),
      default: 'en',
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Dashboard language'),
        description: ({ __ }) => __('pruvious-dashboard', 'Language of the dashboard interface.'),
      },
    }),
    dateFormat: textField({
      default: 'LL',
      validators: [nonEmptyValidator()],
      ui: {
        customComponent: resolvePruviousComponent('@/components/Pruvious/Dashboard/DateTimeFormatField.vue'),
        label: ({ __ }) => __('pruvious-dashboard', 'Date format'),
        placeholder: 'YYYY-MM-DD',
        description: {
          text: ({ __ }) =>
            [
              '|||',
              '|-|-|',
              '|`YY`|' + __('pruvious-dashboard', 'dateFormat:YY') + '|',
              '|`YYYY`|' + __('pruvious-dashboard', 'dateFormat:YYYY') + '|',
              '|`M`|' + __('pruvious-dashboard', 'dateFormat:M') + '|',
              '|`MM`|' + __('pruvious-dashboard', 'dateFormat:MM') + '|',
              '|`MMM`|' + __('pruvious-dashboard', 'dateFormat:MMM') + '|',
              '|`MMMM`|' + __('pruvious-dashboard', 'dateFormat:MMMM') + '|',
              '|`D`|' + __('pruvious-dashboard', 'dateFormat:D') + '|',
              '|`DD`|' + __('pruvious-dashboard', 'dateFormat:DD') + '|',
              '|`d`|' + __('pruvious-dashboard', 'dateFormat:d') + '|',
              '|`dd`|' + __('pruvious-dashboard', 'dateFormat:dd') + '|',
              '|`ddd`|' + __('pruvious-dashboard', 'dateFormat:ddd') + '|',
              '|`dddd`|' + __('pruvious-dashboard', 'dateFormat:dddd') + '|',
              '|`Q`|' + __('pruvious-dashboard', 'dateFormat:Q') + '|',
              '|`Do`|' + __('pruvious-dashboard', 'dateFormat:Do') + '|',
              '|`w`|' + __('pruvious-dashboard', 'dateFormat:w') + '|',
              '|`ww`|' + __('pruvious-dashboard', 'dateFormat:ww') + '|',
              '|`W`|' + __('pruvious-dashboard', 'dateFormat:W') + '|',
              '|`WW`|' + __('pruvious-dashboard', 'dateFormat:WW') + '|',
              '|`wo`|' + __('pruvious-dashboard', 'dateFormat:wo') + '|',
              '|`L`|' + __('pruvious-dashboard', 'dateFormat:L') + '|',
              '|`l`|' + __('pruvious-dashboard', 'dateFormat:l') + '|',
              '|`LL`|' + __('pruvious-dashboard', 'dateFormat:LL') + '|',
              '|`ll`|' + __('pruvious-dashboard', 'dateFormat:ll') + '|',
              '|`[...]`|' + __('pruvious-dashboard', 'dateFormat:[...]') + '|',
            ].join('\n'),
        },
      },
    }),
    timeFormat: textField({
      default: 'LTS',
      validators: [nonEmptyValidator()],
      ui: {
        customComponent: resolvePruviousComponent('@/components/Pruvious/Dashboard/DateTimeFormatField.vue'),
        label: ({ __ }) => __('pruvious-dashboard', 'Time format'),
        placeholder: 'HH:mm:ss',
        description: {
          text: ({ __ }) =>
            [
              '|||',
              '|-|-|',
              '|`H`|' + __('pruvious-dashboard', 'timeFormat:H') + '|',
              '|`HH`|' + __('pruvious-dashboard', 'timeFormat:HH') + '|',
              '|`h`|' + __('pruvious-dashboard', 'timeFormat:h') + '|',
              '|`hh`|' + __('pruvious-dashboard', 'timeFormat:hh') + '|',
              '|`m`|' + __('pruvious-dashboard', 'timeFormat:m') + '|',
              '|`mm`|' + __('pruvious-dashboard', 'timeFormat:mm') + '|',
              '|`s`|' + __('pruvious-dashboard', 'timeFormat:s') + '|',
              '|`ss`|' + __('pruvious-dashboard', 'timeFormat:ss') + '|',
              '|`SSS`|' + __('pruvious-dashboard', 'timeFormat:SSS') + '|',
              '|`Z`|' + __('pruvious-dashboard', 'timeFormat:Z') + '|',
              '|`ZZ`|' + __('pruvious-dashboard', 'timeFormat:ZZ') + '|',
              '|`A`|' + __('pruvious-dashboard', 'timeFormat:A') + '|',
              '|`a`|' + __('pruvious-dashboard', 'timeFormat:a') + '|',
              '|`k`|' + __('pruvious-dashboard', 'timeFormat:k') + '|',
              '|`kk`|' + __('pruvious-dashboard', 'timeFormat:kk') + '|',
              '|`z`|' + __('pruvious-dashboard', 'timeFormat:z') + '|',
              '|`zzz`|' + __('pruvious-dashboard', 'timeFormat:zzz') + '|',
              '|`LT`|' + __('pruvious-dashboard', 'timeFormat:LT') + '|',
              '|`LTS`|' + __('pruvious-dashboard', 'timeFormat:LTS') + '|',
              '|`[...]`|' + __('pruvious-dashboard', 'timeFormat:[...]') + '|',
            ].join('\n'),
        },
      },
    }),
  },
  logs: {
    exposeData: false,
  },
  indexes: [{ fields: ['email'], unique: true }, { fields: ['tokenSubject'], unique: true }, { fields: ['isActive'] }],
  hooks: {
    beforeQueryPreparation: [denyWhere(['password', 'tokenSubject'])],
    afterQueryExecution: [maskFields(['password', 'tokenSubject'])],
  },
  guards: [
    async (context) => {
      const event = useEvent()
      const { auth } = event.context.pruvious

      if (auth.isLoggedIn) {
        // Only admins can edit the email addresses of other admins
        if (context.operation === 'update' && isDefined(context.getRawInputValue('email')) && !auth.user.isAdmin) {
          const users = await selectUsers(context.whereCondition, context.cache)
          if (users.some(({ isAdmin }) => isAdmin)) {
            setResponseStatus(event, 403)
            throw new Error(__('pruvious-api', 'You do not have permission to change administrator email addresses'))
          }
        }

        // Only admins can change the passwords of other admins
        if (context.operation === 'update' && isDefined(context.getRawInputValue('password')) && !auth.user.isAdmin) {
          const users = await selectUsers(context.whereCondition, context.cache)
          if (users.some(({ isAdmin }) => isAdmin)) {
            setResponseStatus(event, 403)
            throw new Error(__('pruvious-api', 'You do not have permission to change administrator passwords'))
          }
        }

        // Only users with the `logout-other-users` permission can sign out other users
        if (
          context.operation === 'update' &&
          isDefined(context.getRawInputValue('tokenSubject')) &&
          !hasPermission('logout-other-users')
        ) {
          const users = await selectUsers(context.whereCondition, context.cache)
          if (users.some(({ id }) => id !== auth.user.id)) {
            setResponseStatus(event, 403)
            throw new Error(__('pruvious-api', 'You do not have permission to sign out other users'))
          }
        }

        // Only admins can activate or deactivate other admins
        if (context.operation === 'update' && isDefined(context.getRawInputValue('isActive')) && !auth.user.isAdmin) {
          const users = await selectUsers(context.whereCondition, context.cache)
          if (users.some(({ isAdmin }) => isAdmin)) {
            setResponseStatus(event, 403)
            throw new Error(
              __('pruvious-api', 'You do not have permission to change the active status of administrators'),
            )
          }
        }

        // Only admins can change the administrator status
        if (context.operation === 'update' && isDefined(context.getRawInputValue('isAdmin')) && !auth.user.isAdmin) {
          throw new Error(__('pruvious-api', 'You do not have permission to manage administrators'))
        }

        // Only admins can delete other admins
        if (context.operation === 'delete' && !auth.user.isAdmin) {
          const users = await selectUsers(context.whereCondition, context.cache)
          if (users.some(({ isAdmin }) => isAdmin)) {
            setResponseStatus(event, 403)
            throw new Error(__('pruvious-api', 'You do not have permission to delete administrators'))
          }
        }
      }
    },
  ],
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Users'),
    menu: { group: 'management', icon: 'users', order: 1 },
    indexPage: {
      table: {
        columns: ['email', 'roles', 'isActive | 150px', 'isAdmin | 150px', 'createdAt | 150px'],
        orderBy: 'email:asc',
      },
    },
    createPage: {
      fields: [
        { row: ['email', 'password'] },
        { row: ['firstName', 'lastName'] },
        { row: ['isActive', 'isAdmin'] },
        'roles',
        { row: ['contentLanguage', 'dashboardLanguage'] },
        { row: ['dateFormat', 'timeFormat'] },
      ],
    },
    updatePage: { fields: 'mirror' },
  },
}))

async function selectUsers(whereCondition: WhereCondition[], cache: Record<string, any>) {
  const query = await selectFrom('Users')
    .select(['id', 'isAdmin'])
    .setWhereCondition(whereCondition)
    .useCache(cache)
    .all()

  if (query.success) {
    return query.data
  } else {
    throw new Error(query.runtimeError)
  }
}
