import {
  buttonGroupField,
  defineSingleton,
  imageField,
  repeaterField,
  textField,
  trueFalseField,
  urlValidator,
} from '#pruvious/server'
import { isString, withoutTrailingSlash } from '@pruvious/utils'

const isMultiLanguage = useRuntimeConfig().pruvious.i18n.languages.length > 1

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
        description: isMultiLanguage
          ? ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Discourage search engines from indexing the site in this language. When hidden, per-route and per-page visibility settings are ignored for this language. It is up to search engines to honor this request.',
              )
          : ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Discourage search engines from indexing the entire site. When hidden, per-route and per-page visibility settings are ignored. It is up to search engines to honor this request.',
              ),
      },
    }),
    sharingImage: imageField({
      minWidth: 600,
      minHeight: 315,
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Sharing image'),
        description: isMultiLanguage
          ? ({ __ }) =>
              __(
                'pruvious-dashboard',
                'The default image used when pages in this language are shared on social media. Individual routes and pages can override this image. Recommended size is 1200x630 pixels.',
              )
          : ({ __ }) =>
              __(
                'pruvious-dashboard',
                'The default image used when pages are shared on social media. Individual routes and pages can override this image. Recommended size is 1200x630 pixels.',
              ),
      },
    }),
    metaTags: repeaterField({
      subfields: {
        attribute: buttonGroupField({
          default: 'name',
          choices: [
            { value: 'name', label: ({ __ }) => __('pruvious-dashboard', 'Standard') },
            { value: 'property', label: ({ __ }) => __('pruvious-dashboard', 'Open Graph') },
            { value: 'http-equiv', label: ({ __ }) => __('pruvious-dashboard', 'HTTP header') },
          ],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Attribute'),
            description: ({ __ }) =>
              __(
                'pruvious-dashboard',
                'The attribute used to identify the meta tag. Use Open Graph (`property`) for `og:*` tags, HTTP header (`http-equiv`) for response-header-like directives such as `Content-Security-Policy`, and Standard (`name`) for everything else.',
              ),
          },
        }),
        key: textField({
          required: true,
          sanitizers: [(value) => (isString(value) ? value.trim() : value)],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Key'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'The value of the attribute (e.g. `og:type`, `description`, `twitter:card`).'),
            placeholder: 'og:type',
          },
        }),
        content: textField({
          required: true,
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'Content'),
            description: ({ __ }) => __('pruvious-dashboard', 'The value of the `content` attribute on the meta tag.'),
            placeholder: 'website',
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Meta tags'),
        description: isMultiLanguage
          ? ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Additional meta tags rendered in the document head for this language. Individual routes and pages may override entries by attribute and key.',
              )
          : ({ __ }) =>
              __(
                'pruvious-dashboard',
                'Additional meta tags rendered in the document head. Individual routes and pages may override entries by attribute and key.',
              ),
        addItemLabel: ({ __ }) => __('pruvious-dashboard', 'Add meta tag'),
        itemLabelConfiguration: { subfieldValue: 'key' },
        subfieldsLayout: ['attribute', { row: ['key', 'content'] }],
      },
    }),
    logo: imageField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Logo'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'The site logo used in structured data (JSON-LD Organization). Recommended size is at least 112x112 pixels with a transparent background.',
          ),
      },
    }),
    favicon: imageField({
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Favicon'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'The icon shown in browser tabs and bookmarks. Square images of at least 32x32 pixels are recommended.',
          ),
      },
    }),
    socialLinks: repeaterField({
      subfields: {
        url: textField({
          required: true,
          validators: [urlValidator()],
          ui: {
            label: ({ __ }) => __('pruvious-dashboard', 'URL'),
            description: ({ __ }) =>
              __('pruvious-dashboard', 'The full URL of the social profile (e.g. `https://twitter.com/example`).'),
            placeholder: 'https://twitter.com/example',
          },
        }),
      },
      ui: {
        label: ({ __ }) => __('pruvious-dashboard', 'Social profiles'),
        description: ({ __ }) =>
          __(
            'pruvious-dashboard',
            'Public URLs of the official social media profiles for the site. Rendered as `sameAs` entries in the Organization structured data.',
          ),
        addItemLabel: ({ __ }) => __('pruvious-dashboard', 'Add profile'),
        itemLabelConfiguration: { subfieldValue: 'url' },
      },
    }),
  },
  syncedFields: ['baseURL', 'logo', 'favicon', 'socialLinks'],
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
              'metaTags',
            ],
          },
          {
            label: ({ __ }) => __('pruvious-dashboard', 'Branding'),
            fields: ['logo', '---', 'favicon'],
          },
          {
            label: ({ __ }) => __('pruvious-dashboard', 'Social'),
            fields: ['sharingImage', '---', 'socialLinks'],
          },
        ],
      },
    ],
  },
  copyTranslation: ({ source }) => source,
})
