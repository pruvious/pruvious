import { buttonGroupField, defineSingleton, textField, trueFalseField, urlValidator } from '#pruvious/server'
import { isString, withoutTrailingSlash } from '@pruvious/utils'

export default defineSingleton({
  fields: {
    baseURL: textField({
      sanitizers: [(value) => (isString(value) ? withoutTrailingSlash(value.toLowerCase()) : value)],
      validators: [urlValidator()],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Base URL'),
        placeholder: ({ __ }) => __('pruvious-dashboard', 'https://example.com'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'The root URL of your website used for generating full URLs in SEO metadata and sitemaps.',
          ),
      },
    }),
    baseTitle: textField({
      default: 'My Pruvious Site',
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Base title'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Text displayed in browsers before or after the regular page title (e.g., Page Title | Base Title).',
          ),
      },
    }),
    titleSeparator: textField({
      default: ' | ',
      trim: false,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Title separator'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Character(s) used to separate the page title from the base title.'),
      },
    }),
    baseTitlePosition: buttonGroupField({
      default: 'after',
      choices: [
        { value: 'before', label: ({ __ }) => __('pruvious-dashboard', 'Before') },
        { value: 'after', label: ({ __ }) => __('pruvious-dashboard', 'After') },
      ],
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Base title position'),
        description: ({ __ }) =>
          __('pruvious-dashboard', 'Controls whether the base title appears before or after the page title.'),
      },
    }),
    isIndexable: trueFalseField({
      default: true,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Search engine visibility'),
        yesLabel: ({ __ }) => __('pruvious-dashboard', 'Visible'),
        noLabel: ({ __ }) => __('pruvious-dashboard', 'Hidden'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Controls whether search engines can index your site. When hidden, search engines are asked not to index the site (though they may not always respect this setting).',
          ),
      },
    }),
    // @todo sharingImage
    // @todo logo
    // @todo favicon
    // @todo socialMediaMeta
    // @todo metaTags
    // @todo scripts
    // @todo styles
  },
  syncedFields: ['baseURL', 'isIndexable'],
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'SEO'),
    icon: 'eye-search',
    menu: { group: 'general', order: 20 },
    fieldsLayout: [
      {
        tabs: [
          {
            label: ({ __ }) => __('pruvious-dashboard', 'General'),
            fields: [
              'baseURL',
              { row: ['baseTitle', 'titleSeparator | 16rem', 'baseTitlePosition | 16rem'] },
              { card: ['isIndexable'] },
            ],
          },
        ],
      },
    ],
  },
  copyTranslation: ({ source }) => source,
})
