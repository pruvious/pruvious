import { userCapabilities } from '#pruvious/preflight'
import argon2 from 'argon2'
import { defaultSanitizer } from '../../sanitizers/default'
import { uniqueArray } from '../../utils/array'
import { __ } from '../../utils/server/translate-string'
import { isString, titleCase } from '../../utils/string'
import { emailValidator } from '../../validators/string'
import { uniqueValidator } from '../../validators/unique'
import { defineCollection } from '../collection.definition'
import { fetchSubsetRecords } from '../query-helpers'

export default defineCollection({
  name: 'users',
  mode: 'multi',
  search: {
    default: [
      { field: 'firstName', reserve: 60 },
      { field: 'lastName', reserve: 60 },
      { field: 'email', reserve: 60 },
      { field: 'isActive', extractKeywords: ({ value }) => (value ? 'active' : ''), reserve: 6 },
      { field: 'isAdmin', extractKeywords: ({ value }) => (value ? 'administrator' : ''), reserve: 13 },
      {
        field: 'capabilities',
        extractKeywords: async ({ value, record }) =>
          uniqueArray([...value, ...(record.role?.capabilities ?? [])])
            .sort()
            .join(', '),
        fieldValueType: 'populated',
      },
    ],
  },
  nonCachedFields: ['password'],
  guards: [
    {
      onDelete: true,
      guard: async ({ cache, currentQuery, language, user }) => {
        const records = await fetchSubsetRecords<'users'>(currentQuery as any, 'delete', {
          data: cache,
          key: 'records',
        })

        for (const { id, isAdmin } of records) {
          if (id === user?.id) {
            throw new Error(__(language, 'pruvious-server', 'You cannot delete your own user account'))
          } else if (isAdmin) {
            throw new Error(__(language, 'pruvious-server', 'You are not authorized to delete admin users'))
          }
        }
      },
    },
  ],
  dashboard: {
    icon: 'Users',
    primaryField: 'email',
    overviewTable: {
      columns: [{ field: 'email', width: 30 }, 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'],
      searchLabel: ['firstName', 'email'],
    },
    fieldLayout: [
      ['firstName', 'lastName'],
      ['email', 'isActive', 'isAdmin'],
      '<~runtime/components/misc/UserPasswordField.vue>',
      'role',
      'capabilities',
      ['<~runtime/components/misc/DateFormatField.vue>', '<~runtime/components/misc/TimeFormatField.vue>'],
    ],
    additionalRecordOptionsVueComponent: '~runtime/components/misc/LogoutUserFromAllSessions.vue',
  },
  fields: {
    /*
    |--------------------------------------------------------------------------
    | isActive
    |--------------------------------------------------------------------------
    |
    */
    isActive: {
      type: 'switch',
      options: {
        label: 'Status',
        description: "Determines the user's login access to the CMS.",
        trueLabel: 'Active',
        falseLabel: 'Inactive',
      },
      additional: {
        guards: [
          {
            onUpdate: true,
            guard: async ({ cache, operation, currentQuery, language, value }) => {
              if (!value) {
                const records = await fetchSubsetRecords<'users'>(currentQuery as any, operation, {
                  data: cache,
                  key: 'records',
                })

                if (records.some(({ isAdmin }) => isAdmin)) {
                  throw new Error(__(language, 'pruvious-server', 'You are not authorized to deactivate admin users'))
                }
              }
            },
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | isAdmin
    |--------------------------------------------------------------------------
    |
    */
    isAdmin: {
      type: 'switch',
      options: {
        label: 'Administrator',
        description: 'Administrators have all privileges within the CMS, regardless of their role and capabilities.',
      },
      additional: {
        guards: [
          async ({ cache, currentQuery, language, operation, value }) => {
            if (operation === 'create') {
              if (value) {
                throw new Error(__(language, 'pruvious-server', 'You are not authorized to create admin users'))
              }
            } else if (operation === 'update') {
              const records = await fetchSubsetRecords<'users'>(currentQuery as any, 'update', {
                data: cache,
                key: 'records',
              })

              if (value && records.some(({ isAdmin }) => !isAdmin)) {
                throw new Error(
                  __(language, 'pruvious-server', 'You are not authorized to promote users to admin status'),
                )
              } else if (!value && records.some(({ isAdmin }) => isAdmin)) {
                throw new Error(__(language, 'pruvious-server', 'You are not authorized to demote admin users'))
              }
            }
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | firstName
    |--------------------------------------------------------------------------
    |
    */
    firstName: {
      type: 'text',
      options: {
        label: 'First name',
        autocomplete: 'given-name',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | lastName
    |--------------------------------------------------------------------------
    |
    */
    lastName: {
      type: 'text',
      options: {
        label: 'Last name',
        autocomplete: 'family-name',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | email
    |--------------------------------------------------------------------------
    |
    */
    email: {
      type: 'text',
      options: {
        label: 'Email address',
        required: true,
        type: 'email',
        autocomplete: 'email',
      },
      additional: {
        index: true,
        unique: 'perLanguage',
        guards: [
          {
            onCreate: false,
            onUpdate: true,
            guard: async ({ value, cache, currentQuery, language }) => {
              const records = await fetchSubsetRecords<'users'>(currentQuery as any, 'update', {
                data: cache,
                key: 'records',
              })

              if (records.some(({ isAdmin, email }) => isAdmin && email !== value)) {
                throw new Error(
                  __(
                    language,
                    'pruvious-server',
                    'You are not authorized to modify the email addresses of admin users',
                  ),
                )
              }
            },
          },
        ],
        validators: [emailValidator, uniqueValidator],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | password
    |--------------------------------------------------------------------------
    |
    */
    password: {
      type: 'text',
      options: {
        label: 'Password',
        required: true,
        trim: false,
        type: 'password',
        autocomplete: 'new-password',
      },
      additional: {
        protected: true,
        guards: [
          {
            onCreate: false,
            onUpdate: true,
            guard: async ({ cache, currentQuery, language }) => {
              const records = await fetchSubsetRecords<'users'>(currentQuery as any, 'update', {
                data: cache,
                key: 'records',
              })

              if (records.some(({ isAdmin }) => isAdmin)) {
                throw new Error(
                  __(language, 'pruvious-server', 'You are not authorized to change passwords for admin users'),
                )
              }
            },
          },
        ],
        sanitizers: [
          async ({ value }) => {
            return isString(value) && value.length >= 8 ? await argon2.hash(value) : value
          },
        ],
        validators: [
          ({ language, value }) => {
            if (value.length < 8) {
              throw new Error(__(language, 'pruvious-server', 'The password must be at least 8 characters long'))
            }
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | role
    |--------------------------------------------------------------------------
    |
    */
    role: {
      type: 'record',
      options: {
        label: 'Role',
        description: "The user role defines the user's base capabilities within the CMS.",
        collection: 'roles',
        fields: { id: true, name: true, capabilities: true },
        populate: true,
      },
      additional: {
        foreignKey: { table: 'roles' },
      },
    },

    /*
    |--------------------------------------------------------------------------
    | capabilities
    |--------------------------------------------------------------------------
    |
    */
    capabilities: {
      type: 'chips',
      options: {
        label: 'User capabilities',
        description: 'List of capabilities granted to the user in addition to their role capabilities.',
        placeholder: 'Add capability',
        choices: Object.fromEntries(
          userCapabilities.map((capability) => [
            capability,
            capability.startsWith('collection-')
              ? titleCase(
                  capability.replace(
                    /^collection-([a-z0-9-]+)-(create-many|read-many|update-many|delete-many|create|read|update|delete)$/i,
                    '$2-$1',
                  ),
                  false,
                )
              : titleCase(capability, false),
          ]),
        ),
        overrideType: 'UserCapability[]',
        tooltips: true,
        sortable: true,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | dashboardLanguage
    |--------------------------------------------------------------------------
    |
    */
    dashboardLanguage: {
      type: 'select',
      options: {
        label: 'Dashboard language',
        description: 'The preferred language for the dashboard interface.',
        required: true,
        default: 'en',
        choices: { en: 'English' },
      },
      additional: {
        sanitizers: [{ onCreate: true, sanitizer: (context) => context.value || defaultSanitizer(context) }],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | dateFormat
    |--------------------------------------------------------------------------
    |
    */
    dateFormat: {
      type: 'text',
      options: {
        label: 'Date format',
        required: true,
        description: [
          `**YY** - Two-digit year (e.g. 23)`,
          `**YYYY** - Four-digit year (e.g. 2023)`,
          `**M** - The month, beginning at 1 (e.g. 1-12)`,
          `**MM** - The month, 2-digits (e.g. 01-12)`,
          `**MMM** - The abbreviated month name (e.g. Jan-Dec)`,
          `**MMMM** - The full month name (e.g. January-December)`,
          `**D** - The day of the month (e.g. 1-31)`,
          `**DD** - The day of the month, 2-digits (e.g. 01-31)`,
          `**d** - The day of the week, with Sunday as 0 (e.g. 0-6)`,
          `**dd** - The min name of the day of the week (e.g. Su-Sa)`,
          `**ddd** - The short name of the day of the week (e.g. Sun-Sat)`,
          `**dddd** - The name of the day of the week (e.g. Sunday-Saturday)`,
          `**Q** - Quarter (e.g. 1-4)`,
          `**Do** - Day of Month with ordinal (e.g. 1st 2nd ... 31st)`,
          `**w** - Week of year (e.g. 1 2 ... 52 53)`,
          `**ww** - Week of year, 2-digits (e.g. 01 02 ... 52 53)`,
          `**W** - ISO Week of year (e.g. 1 2 ... 52 53)`,
          `**WW** - ISO Week of year, 2-digits (e.g. 01 02 ... 52 53)`,
          `**wo** - Week of year with ordinal (e.g. 1st 2nd ... 52nd 53rd)`,
          `**[...]** - Escaped characters (e.g. [Year])`,
        ],
        default: 'YYYY-MM-DD',
      },
      additional: {
        sanitizers: [{ onCreate: true, sanitizer: (context) => context.value || defaultSanitizer(context) }],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | timeFormat
    |--------------------------------------------------------------------------
    |
    */
    timeFormat: {
      type: 'text',
      options: {
        label: 'Time format',
        required: true,
        description: [
          `**H** - The hour (e.g. 0-23)`,
          `**HH** - The hour, 2-digits (e.g. 00-23)`,
          `**h** - The hour, 12-hour clock (e.g. 1-12)`,
          `**hh** - The hour, 12-hour clock, 2-digits (e.g. 01-12)`,
          `**m** - The minute (e.g. 0-59)`,
          `**mm** - The minute, 2-digits (e.g. 00-59)`,
          `**s** - The second (e.g. 0-59)`,
          `**ss** - The second, 2-digits (e.g. 00-59)`,
          `**SSS** - The millisecond, 3-digits (e.g. 000-999)`,
          `**Z** - The offset from UTC, ±HH:mm (e.g. +05:00)`,
          `**ZZ** - The offset from UTC, ±HHmm (e.g. +0500)`,
          `**A** - AM PM`,
          `**a** - am pm`,
          `**k** - The hour, beginning at 1 (e.g. 1-24)`,
          `**kk** - The hour, 2-digits, beginning at 1 (e.g. 01-24)`,
          `**z** - Abbreviated named offset (e.g. GMT+1)`,
          `**zzz** - Unabbreviated named offset (e.g. Central European Standard Time)`,
          `**[...]** - Escaped characters (e.g. [Hours])`,
        ],
        default: 'HH:mm:ss',
      },
      additional: {
        sanitizers: [{ onCreate: true, sanitizer: (context) => context.value || defaultSanitizer(context) }],
      },
    },
  },
})
