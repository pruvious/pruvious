// @ts-check

const { flush, rebuildSitemap } = require('../app/SettingQuery')

/** @type {import('api').SettingFactory} */
module.exports = async () => ({
  group: 'seo',
  public: true,
  label: 'SEO',
  description: 'Search engine optimization (SEO) settings',
  icon: 'input-search',
  translatable: true,
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              type: 'stack',
              minFieldWidth: ['fill', '10rem', '10rem'],
              fields: [
                {
                  name: 'baseTitle',
                  type: 'text',
                  description:
                    'Text displayed in browsers before or after the regular page title (e.g. Page Title | Base Title).',
                  default: 'My Pruvious Site',
                },
                {
                  name: 'titleSeparator',
                  type: 'text',
                  description: 'Characters used to separate the page title and base title.',
                  trim: false,
                  default: ' | ',
                },
                {
                  name: 'baseTitlePosition',
                  type: 'buttons',
                  choices: [
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                  ],
                  default: 'right',
                },
              ],
            },
            {
              name: 'sitemap',
              type: 'switch',
              description:
                'Whether to automatically manage the sitemap. A sitemap is a file where you provide information about the pages on your site, and the relationships between them. Search engines like Google read this file to crawl your site more efficiently.',
              falseLabel: 'Manual',
              trueLabel: 'Auto',
              default: true,
            },
            {
              name: 'visible',
              label: 'Search engine visibility',
              type: 'switch',
              description:
                'Discourage search engines from indexing this site. It is up to search engines to honor this request.',
              falseLabel: 'Hidden',
              trueLabel: 'Visible',
              default: true,
            },
          ],
        },
        {
          label: 'Images',
          fields: [
            {
              name: 'sharingImage',
              label: 'Default sharing image',
              type: 'image',
              description:
                'An image that appears when someone shares a page link on a social network. The optimal image size is 1200 × 630 pixels.',
              minWidth: 1200,
              minHeight: 630,
              allow: ['gif', 'jpg', 'png', 'webp'],
              sources: [{ width: 1200, height: 630, quality: 90 }],
            },
            {
              name: 'logo',
              label: 'Organization logo',
              type: 'image',
              description:
                "Specify the image Google uses for your organization's logo in search results and in the Google knowledge panel.",
              minWidth: 112,
              minHeight: 112,
              allow: ['bmp', 'gif', 'jpeg', 'png', 'webp', 'svg'],
            },
            {
              name: 'favicon',
              type: 'image',
              description:
                "A small square image that appears next to the URL in a browser's address bar.",
              minWidth: 48,
              minHeight: 48,
              allow: ['svg'],
              transformSvgs: true,
              sources: [{ width: 48, height: 48, format: 'png', quality: 100, resize: 'contain' }],
            },
          ],
        },
        {
          label: 'Meta',
          fields: [
            {
              name: 'socialMediaMeta',
              label: 'Social media',
              type: 'switch',
              description:
                'Whether to auto-generate **og** and **twitter** meta tags based on the current page title, description, and URL.',
              falseLabel: 'Manual',
              trueLabel: 'Auto',
              default: true,
            },
            {
              name: 'metaTags',
              label: 'Default meta tags',
              type: 'repeater',
              description:
                'Default **&lt;meta&gt;** tags for all pages. Values entered here will override other automatically generated meta tags.',
              itemLabel: 'meta tag',
              subFields: [
                {
                  type: 'stack',
                  minFieldWidth: ['20rem', 'fill'],
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      suggestions: [
                        'author',
                        'color-scheme',
                        'creator',
                        'description',
                        'generator',
                        'googlebot',
                        'keywords',
                        'publisher',
                        'referrer',
                        'robots',
                        'theme-color',
                        'viewport',
                      ],
                      required: true,
                      placeholder: 'e.g. author',
                    },
                    {
                      name: 'content',
                      type: 'text',
                      required: true,
                      placeholder: 'e.g. John Doe',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Scripts',
          fields: [
            {
              name: 'scripts',
              label: 'Scripts',
              type: 'repeater',
              description:
                'List of external scripts or inline JS code that can be placed in different positions on all pages of the website.',
              itemLabel: 'script',
              subFields: [
                {
                  type: 'stack',
                  minFieldWidth: ['10rem', 'fill', 'fill', '16rem'],
                  fields: [
                    {
                      name: 'kind',
                      type: 'buttons',
                      required: true,
                      default: 'external',
                      choices: [
                        { label: 'External', value: 'external' },
                        { label: 'Inline', value: 'inline' },
                      ],
                    },
                    {
                      name: 'url',
                      label: 'URL',
                      type: 'url',
                      required: true,
                      condition: { kind: { $eq: 'external' } },
                    },
                    {
                      name: 'js',
                      label: 'JavaScript code',
                      type: 'textArea',
                      required: true,
                      condition: { kind: { $eq: 'inline' } },
                    },
                    {
                      name: 'position',
                      type: 'select',
                      required: true,
                      default: 'headLow',
                      choices: [
                        { label: 'Head', value: 'head' },
                        { label: 'Body (after opening tag)', value: 'bodyOpen' },
                        { label: 'Body (before closing tag)', value: 'bodyClose' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  onUpdate: () => {
    flush()
    rebuildSitemap()
  },
})
