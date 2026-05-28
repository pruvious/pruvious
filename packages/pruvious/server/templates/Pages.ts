import { blocksField, defineTemplate, type SEOFieldPresetOptions } from '#pruvious/server'

export default defineTemplate(() => ({
  fields: {
    blocks: blocksField({
      denyRootBlocks: ['Button', 'ProseNode'],
    }),
  },
  routing: {
    publicFields: ['blocks', 'seo', 'createdAt', 'updatedAt'],
    labelField: ['seo.title'],
    subpath: { allowEmptyString: true },
    isPublic: true,
    scheduledAt: true,
    seo: {
      ui: {
        dataTable: {
          subfield: 'title',
          label: ({ __ }) => __('pruvious-dashboard', 'Title'),
        },
      },
    } satisfies SEOFieldPresetOptions,
    layout: 'page',
  },
  author: true,
  editors: true,
  ui: {
    indexPage: {
      dataTable: {
        columns: [
          'seo',
          'subpath | 16rem',
          'isPublic | 8rem',
          'author | 12rem',
          'createdAt | 12rem',
          'updatedAt | 12rem',
        ],
      },
    },
  },
}))
