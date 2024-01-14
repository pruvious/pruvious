import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'redirects',
  mode: 'single',
  label: { collection: { plural: 'Redirection', singular: 'Redirection' } },
  dashboard: {
    icon: 'ArrowBounce',
    fieldLayout: [
      {
        Rules: ['rules'],
        Test: ['<~runtime/components/misc/RedirectsTest.vue>'],
      },
    ],
  },
  cacheQueries: 0,
  fields: {
    /*
    |--------------------------------------------------------------------------
    | rules
    |--------------------------------------------------------------------------
    |
    */
    rules: {
      type: 'repeater',
      options: {
        label: 'Redirection rules',
        description: 'Redirects are applied in the specified order.',
        subfields: {
          isRegExp: {
            type: 'switch',
            options: {
              label: 'RegExp match',
              description: 'Whether to use JavaScript regular expressions to match the path.',
            },
          },
          code: {
            type: 'button-group',
            options: {
              label: 'Status code',
              description:
                'Whether the redirection is intended to be permanent (301) or temporary (302). Search engine robots, RSS readers, and other web crawlers will update their links to the target URL.',
              choices: {
                '301': '301',
                '302': '302',
              },
              default: '302',
              required: true,
            },
          },
          forwardQueryParams: {
            type: 'switch',
            options: {
              label: 'Forward query parameters',
              description: 'Whether to forward query parameters to the target URL.',
            },
          },
          from: {
            type: 'text',
            options: {
              label: 'Match',
              description: 'The path to match.',
              placeholder: 'e.g., /news',
              required: true,
            },
            additional: {
              conditionalLogic: { isRegExp: false },
              validators: [
                ({ __, language, value }) => {
                  if (!value.startsWith('/')) {
                    throw new Error(__(language, 'pruvious-server', "The path must start with a slash ('/')"))
                  }
                },
              ],
            },
          },
          fromRegExp: {
            type: 'text',
            options: {
              label: 'Match (RegExp)',
              description:
                'The JavaScript regular expression to match. You can use indexed capture groups in **$n** format to replace parts of the target URL.',
              placeholder: 'e.g., ^/news/(.*)$',
              required: true,
            },
            additional: {
              conditionalLogic: { isRegExp: true },
              validators: [
                ({ __, language, value }) => {
                  try {
                    new RegExp(value)
                  } catch (e: any) {
                    throw new Error(__(language, 'pruvious-server', e.message as any))
                  }
                },
              ],
            },
          },
          to: {
            type: 'text',
            options: {
              label: 'Redirect to',
              description: 'The target path or URL.',
              placeholder: 'e.g., /blog',
              required: true,
            },
            additional: {
              conditionalLogic: { isRegExp: false },
              validators: [
                ({ __, language, value }) => {
                  if (!value.startsWith('/') && !value.startsWith('http')) {
                    throw new Error(
                      __(
                        language,
                        'pruvious-server',
                        "The target must be a path starting with a slash ('/') or a URL starting with 'http'",
                      ),
                    )
                  }
                },
              ],
            },
          },
          toRegExp: {
            type: 'text',
            options: {
              label: 'Redirect to (RegExp)',
              description:
                'The target JavaScript regular expression. You can use indexed capture groups in **$n** format to replace parts of the target URL.',
              placeholder: 'e.g., /blog/$1',
              required: true,
            },
            additional: {
              conditionalLogic: { isRegExp: true },
              validators: [
                ({ __, language, value }) => {
                  if (!value.startsWith('/') && !value.startsWith('http')) {
                    throw new Error(
                      __(
                        language,
                        'pruvious-server',
                        "The target must be a path starting with a slash ('/') or a URL starting with 'http'",
                      ),
                    )
                  }
                },
              ],
            },
          },
        },
        fieldLayout: [
          ['isRegExp | 10rem', 'code | 10rem', 'from', 'fromRegExp'],
          ['forwardQueryParams | 20rem', 'to', 'toRegExp'],
        ],
      },
    },
  },
})
