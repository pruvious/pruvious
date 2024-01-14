import { isString, isUrl } from '../../utils/string'
import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'seo',
  mode: 'single',
  label: { collection: { plural: 'SEO', singular: 'SEO' } },
  translatable: true,
  dashboard: {
    icon: 'InputSearch',
    fieldLayout: [
      {
        General: ['baseUrl', ['baseTitle', 'titleSeparator | 10rem', 'baseTitlePosition | 10rem'], 'visible'],
        Images: ['sharingImage', 'logo', 'favicon'],
        Meta: ['socialMediaMeta', 'metaTags'],
        Scripts: ['scripts'],
      },
    ],
  },
  fields: {
    /*
    |--------------------------------------------------------------------------
    | baseUrl
    |--------------------------------------------------------------------------
    |
    */
    baseUrl: {
      type: 'text',
      options: {
        label: 'Base URL',
        description: 'The base URL of the website.',
        placeholder: 'e.g., https://example.com',
      },
      additional: {
        translatable: false,
        sanitizers: [({ value }) => (isString(value) ? value.replace(/\/+$/, '') : value)],
        validators: [
          ({ __, language, value }) => {
            if (value && !isUrl(value)) {
              throw new Error(__(language, 'pruvious-server', 'Invalid URL'))
            }
          },
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | baseTitle
    |--------------------------------------------------------------------------
    |
    */
    baseTitle: {
      type: 'text',
      options: {
        label: 'Base title',
        description:
          'Text displayed in browsers before or after the regular page title (e.g., Page Title | Base Title).',
        default: 'My Pruvious Site',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | titleSeparator
    |--------------------------------------------------------------------------
    |
    */
    titleSeparator: {
      type: 'text',
      options: {
        label: 'Title separator',
        description: 'Characters used to separate the page title and base title.',
        default: ' | ',
        trim: false,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | baseTitlePosition
    |--------------------------------------------------------------------------
    |
    */
    baseTitlePosition: {
      type: 'button-group',
      options: {
        label: 'Base title position',
        description: 'The position of the base title relative to the page title.',
        choices: { before: 'Before', after: 'After' },
        default: 'after',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | visible
    |--------------------------------------------------------------------------
    |
    */
    visible: {
      type: 'switch',
      options: {
        label: 'Search engine visibility',
        description:
          'Discourage search engines from indexing this site. It is up to search engines to honor this request.',
        falseLabel: 'Hidden',
        trueLabel: 'Visible',
        default: true,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | sharingImage
    |--------------------------------------------------------------------------
    |
    */
    sharingImage: {
      type: 'image',
      options: {
        label: 'Default sharing image',
        sources: [{ format: 'jpeg', width: 1200, height: 630, quality: 90 }],
        minWidth: 1200,
        minHeight: 630,
        transformSvgs: true,
        description:
          'An image that appears when someone shares a page link on a social network. The optimal image size is 1200 × 630 pixels.',
      },
    },

    /*
    |--------------------------------------------------------------------------
    | logo
    |--------------------------------------------------------------------------
    |
    */
    logo: {
      type: 'image',
      options: {
        label: 'Organization logo',
        allowedTypes: ['bmp', 'gif', 'jpeg', 'png', 'webp', 'svg'],
        minWidth: 112,
        minHeight: 112,
        description:
          "Specify the image Google uses for your organization's logo in search results and in the Google knowledge panel.",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | favicon
    |--------------------------------------------------------------------------
    |
    */
    favicon: {
      type: 'image',
      options: {
        label: 'Favicon',
        allowedTypes: ['svg'],
        transformSvgs: true,
        sources: [{ format: 'png', width: 48, height: 48, resize: 'contain' }],
        minWidth: 112,
        minHeight: 112,
        description: "A small square image that appears next to the URL in a browser's address bar.",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | socialMediaMeta
    |--------------------------------------------------------------------------
    |
    */
    socialMediaMeta: {
      type: 'switch',
      options: {
        label: 'Social media',
        description:
          'Whether to auto-generate **og** and **twitter** meta tags based on the current page title, description, and URL.',
        falseLabel: 'Manual',
        trueLabel: 'Auto',
        default: true,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | metaTags
    |--------------------------------------------------------------------------
    |
    */
    metaTags: {
      type: 'repeater',
      options: {
        label: 'Default meta tags',
        description:
          'The **<meta>** tags for this site. Values entered here will override other automatically generated meta tags.',
        addLabel: 'Add meta tag',
        fieldLayout: [['name | 20rem', 'content']],
        subfields: {
          name: {
            type: 'text',
            options: {
              label: 'Name',
              description: 'The name of the meta tag.',
              required: true,
              placeholder: 'e.g., author',
            },
          },
          content: {
            type: 'text',
            options: {
              label: 'Content',
              description: 'The content of the meta tag.',
              required: true,
              placeholder: 'e.g., John Doe',
            },
          },
        },
      },
    },

    /*
    |--------------------------------------------------------------------------
    | scripts
    |--------------------------------------------------------------------------
    |
    */
    scripts: {
      type: 'repeater',
      options: {
        label: 'Scripts',
        description:
          'List of external scripts or inline JS code that can be placed in different positions on all pages of the website.',
        addLabel: 'Add script',
        fieldLayout: [['kind | 10rem', 'position | 16rem', 'url', 'js']],
        subfields: {
          kind: {
            type: 'button-group',
            options: {
              label: 'Kind',
              choices: { external: 'External', inline: 'Inline' },
              required: true,
              default: 'external',
            },
          },
          url: {
            type: 'text',
            options: {
              label: 'URL',
              required: true,
            },
            additional: {
              conditionalLogic: { kind: 'external' },
            },
          },
          js: {
            type: 'text-area', // @todo code field
            options: {
              label: 'JavaScript',
              required: true,
            },
            additional: {
              conditionalLogic: { kind: 'inline' },
            },
          },
          position: {
            type: 'select',
            options: {
              label: 'Position',
              choices: { head: 'Head', bodyOpen: 'Body (after opening tag)', bodyClose: 'Body (before closing tag)' },
              required: true,
              default: 'bodyClose',
            },
          },
        },
      },
    },
  },
})
