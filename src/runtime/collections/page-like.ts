import type {
  BlockName,
  CollectionField,
  LayoutName,
  PrimaryLanguage,
  PruviousIcon,
  SupportedLanguage,
} from '#pruvious'
import { layouts } from '#pruvious/preflight'
import { nanoid } from 'nanoid'
import pluralize from 'pluralize-esm'
import type { LayoutDefinition } from '../layouts/layout.definition'
import { isUndefined } from '../utils/common'
import { capitalize, isString, isUrlPath, joinRouteParts, removeAccents, titleCase } from '../utils/string'
import { lowercaseValidator } from '../validators/string'
import { uniqueValidator } from '../validators/unique'
import { type MultiEntryCollectionDefinition } from './collection.definition'

export interface PageLikeCollectionOptions {
  /**
   * The collection name.
   */
  name: string

  /**
   * The URL path prefix for the collection records (e.g., 'docs').
   * The prefix can be specified for each supported language separately using an object with language codes as keys.
   *
   * @default ''
   */
  pathPrefix?: string | (Record<PrimaryLanguage, string> & Partial<Record<SupportedLanguage, string>>)

  /**
   * An array of block names allowed to be used in the block builder.
   *
   * By default, all blocks are permitted.
   *
   * @default '*'
   */
  allowedBlocks?: BlockName[] | '*'

  /**
   * An array of block names allowed as top-level blocks in the block builder.
   *
   * Note: Root blocks must also be included in the `allowedBlocks` array.
   *
   * By default, all blocks are permitted as top-level blocks.
   *
   * @default '*'
   */
  rootBlocks?: BlockName[] | '*'

  /**
   * An array of layout names allowed to be used for the collection records.
   *
   * By default, all layouts are permitted.
   *
   * @default '*'
   */
  allowedLayouts?: LayoutName[] | '*'

  /**
   * Additional fields to add to the collection.
   */
  additionalFields?: Record<string, CollectionField>

  /**
   * An array of additional fields to include in the public page response (e.g. `['createdAt', 'author', ...]`).
   * These fields will be included in the `fields` property of the response for the `pages.get` and `previews.get` API endpoints.
   *
   * @default []
   */
  additionalPublicPagesFields?: string[]

  /**
   * The lowercased label to use for the record in the dashboard.
   */
  recordLabel?: { singular: string; plural: string }

  /**
   * The icon used for this collection in the dashboard.
   *
   * @default 'Note'
   */
  icon?: PruviousIcon
}

/**
 * Create a collection definition for a page-like collection.
 */
export function pageLikeCollection(options: PageLikeCollectionOptions): MultiEntryCollectionDefinition {
  const recordLabelPlural = options.recordLabel?.plural ?? titleCase(options.name, false).toLowerCase()
  const recordLabelSingular = options.recordLabel?.singular ?? pluralize.singular(recordLabelPlural)
  const filteredLayouts = layouts.filter(
    ({ name }) =>
      !options.allowedLayouts || options.allowedLayouts === '*' || options.allowedLayouts.includes(name as any),
  )

  return {
    name: options.name,
    mode: 'multi',
    label: { record: { singular: recordLabelSingular, plural: recordLabelPlural } },
    search: {
      default: [
        { field: 'path', reserve: 160 },
        { field: 'title', reserve: 160 },
        { field: 'description', reserve: 160 },
        { field: 'public', extractKeywords: ({ value }) => (value ? 'public' : 'draft'), reserve: 6 },
        { field: 'visible', extractKeywords: ({ value }) => (value ? 'visible' : 'hidden'), reserve: 7 },
        { field: 'blocks', fieldValueType: 'populated' },
      ],
    },
    translatable: true,
    publicPages: {
      pathPrefix: options.pathPrefix ?? '',
      publicField: 'public',
      draftTokenField: 'draftToken',
      publishDateField: 'publishDate',
      layoutField: 'layout',
      additionalFields: options.additionalPublicPagesFields ?? [],
      seo: {
        titleField: 'title',
        baseTitleField: 'baseTitle',
        descriptionField: 'description',
        visibleField: 'visible',
        sharingImageField: 'sharingImage',
        metaTagsField: 'metaTags',
      },
    },
    contentBuilder: {
      blocksField: 'blocks',
      allowedBlocks: options.allowedBlocks ?? '*',
      rootBlocks: options.rootBlocks ?? '*',
    },
    dashboard: {
      icon: options.icon ?? 'Note',
      primaryField: 'title',
      overviewTable: {
        columns: [{ field: 'title', width: 30 }, { field: 'path', width: 30 }, 'public', 'createdAt', 'publishDate'],
        searchLabel: ['title', 'path'],
      },
      fieldLayout: [
        `# ${capitalize(recordLabelSingular, false)}`,
        'public',
        'path',
        '<~runtime/components/misc/RecordUrlField.vue>',
        'publishDate',
        ...Object.keys(options.additionalFields ?? {}),
        'layout',
        'translations',
        '# SEO',
        'title',
        'baseTitle',
        'description',
        'visible',
        'sharingImage',
        'metaTags',
      ],
    },
    duplicate: async ({ record, query }) => {
      const duplicate = { ...record }
      let i = 0

      while (true) {
        duplicate.path = `${duplicate.path.replace(/\-[1-9][0-9]*$/, '')}-${++i}`

        if (
          await (query as any)(options.name)
            .where('path', duplicate.path)
            .where('language', record.language)
            .notExists()
        ) {
          break
        }
      }

      duplicate.public = false
      duplicate.title = (
        duplicate.title.replace(/^\([1-9][0-9]*\)$/, '').replace(/(.*?)( +\([1-9][0-9]*\))?$/, '$1') + ` (${i})`
      ).trim()
      delete duplicate.translations

      return duplicate
    },
    mirrorTranslation: async ({ from, to, language, query }) => {
      const mirror: Record<string, any> = { ...from, id: to?.id, language }
      let i = 0

      if (to) {
        mirror.path = to.path
      } else {
        mirror.public = false

        while (
          await (query as any)(options.name).where('path', mirror.path).where('language', mirror.language).exists()
        ) {
          mirror.path = `${mirror.path.replace(/\-[1-9][0-9]*$/, '')}-${++i}`
        }
      }

      return mirror
    },
    fields: {
      /*
      |--------------------------------------------------------------------------
      | path
      |--------------------------------------------------------------------------
      |
      */
      path: {
        type: 'text',
        options: {
          label: 'URL path',
          description: [
            `The unique URL path of the ${recordLabelSingular}.`,
            "The path always begins with a slash ('/') and never ends with one (e.g., '/about').",
          ],
          required: true,
          default: '/',
        },
        additional: {
          unique: 'perLanguage',
          sanitizers: [
            ({ value }) =>
              isString(value) ? joinRouteParts(removeAccents(value).toLowerCase().replace(/ +/g, '-')) : value,
          ],
          validators: [
            lowercaseValidator,
            ({ __, language, value }) => {
              if (!isUrlPath(value)) {
                throw new Error(
                  __(language, 'pruvious-server', `The ${recordLabelSingular} path must be a URL-safe string` as any),
                )
              }
            },
            (context) =>
              uniqueValidator(
                context,
                context.__(
                  context.language,
                  'pruvious-server',
                  `A ${recordLabelSingular} with this path already exists` as any,
                ),
              ),
          ],
        },
      },

      /*
      |--------------------------------------------------------------------------
      | public
      |--------------------------------------------------------------------------
      |
      */
      public: {
        type: 'switch',
        options: {
          label: 'Status',
          description: `Whether the ${recordLabelSingular} is publicly accessible.`,
          trueLabel: 'Public',
          falseLabel: 'Draft',
          default: true,
        },
        additional: { index: true },
      },

      /*
      |--------------------------------------------------------------------------
      | draftToken
      |--------------------------------------------------------------------------
      |
      */
      draftToken: {
        type: 'text',
        options: {
          label: 'Draft token',
          description: `The token that allows to access the draft version of the ${recordLabelSingular}. It is generated automatically and cannot be changed.`,
        },
        additional: {
          immutable: true,
          sanitizers: [() => nanoid()],
        },
      },

      /*
      |--------------------------------------------------------------------------
      | title
      |--------------------------------------------------------------------------
      |
      */
      title: {
        type: 'text-area',
        options: {
          label: 'Page title',
          description:
            "Defines the document's title that is shown in a browser's title bar or a page's tab. Search engines typically display about the first 55-60 characters of a page title. Text beyond that may be lost, so try not to have titles longer than that. If you must use a longer title, make sure the important parts come earlier and that nothing critical is in the part of the title that is likely to be dropped.",
          spellcheck: true,
        },
        additional: {
          emptyLabel: 'Untitled',
          sanitizers: [({ value }) => (isString(value) ? value.replace(/\s+/g, ' ') : value)],
        },
      },

      /*
      |--------------------------------------------------------------------------
      | baseTitle
      |--------------------------------------------------------------------------
      |
      */
      baseTitle: {
        type: 'switch',
        options: {
          label: 'Base title',
          description:
            'Whether the base title defined in the SEO settings should be displayed together with the page title.',
          default: true,
          trueLabel: 'Show',
          falseLabel: 'Hide',
        },
      },

      /*
      |--------------------------------------------------------------------------
      | description
      |--------------------------------------------------------------------------
      |
      */
      description: {
        type: 'text-area',
        options: {
          label: 'Page description',
          description:
            'Specifying a description that includes keywords relating to the content of your page is useful as it has the potential to make your page appear higher in relevant searches performed in search engines.',
          spellcheck: true,
        },
        additional: {
          sanitizers: [({ value }) => (isString(value) ? value.replace(/\s+/g, ' ') : value)],
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
            'Discourage search engines from indexing this page. It is up to search engines to honor this request.',
          trueLabel: 'Visible',
          falseLabel: 'Hidden',
          default: true,
        },
        additional: { index: true },
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
          label: 'Sharing image',
          sources: [{ format: 'jpeg', width: 1200, height: 630, quality: 90 }],
          minWidth: 1200,
          minHeight: 630,
          transformSvgs: true,
          description:
            'An image that appears when someone shares this page link on a social network. The optimal image size is 1200 × 630 pixels. If not specified, the default sharing image defined in the SEO settings will be used.',
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
          label: 'Meta tags',
          description:
            'The **<meta>** tags for this page. Values entered here will override other automatically generated meta tags.',
          subfields: {
            name: {
              type: 'text',
              options: {
                label: 'Name',
                required: true,
                placeholder: 'e.g., author',
              },
            },
            content: {
              type: 'text',
              options: {
                label: 'Content',
                required: true,
                placeholder: 'e.g., John Doe',
              },
            },
          },
          addLabel: 'Add meta tag',
        },
      },

      /*
      |--------------------------------------------------------------------------
      | layout
      |--------------------------------------------------------------------------
      |
      */
      layout: {
        type: 'select',
        options: {
          label: 'Layout',
          description: `The layout to use for this ${recordLabelSingular}.`,
          default: filteredLayouts.some(({ name }) => name === 'default')
            ? 'default'
            : filteredLayouts[0]?.name ?? null,
          choices: Object.fromEntries(filteredLayouts.map(({ name, label }) => [name, label])),
        },
      },

      /*
      |--------------------------------------------------------------------------
      | publishDate
      |--------------------------------------------------------------------------
      |
      */
      publishDate: {
        type: 'date-time',
        options: {
          label: 'Publish date',
          description: `The date and time when the ${recordLabelSingular} is published or scheduled for publication.`,
        },
      },

      /*
      |--------------------------------------------------------------------------
      | blocks
      |--------------------------------------------------------------------------
      |
      */
      blocks: {
        type: 'repeater',
        options: {
          label: 'Blocks',
          description: `The blocks that make up the ${recordLabelSingular} content.`,
          subfields: {
            block: {
              type: 'block',
              options: {
                label: 'Block',
              },
            },
          },
          addLabel: 'Add block',
        },
        additional: {
          validators: [
            {
              onCreate: true,
              onUpdate: true,
              validator: async ({ __, errors, input, language, value }) => {
                if (isUndefined(input.layout)) {
                  errors.layout = __(language, 'pruvious-server', 'This field is required')
                  return
                }

                const { blocks } = await import('#pruvious/blocks')
                const { walkBlocks } = await import('#pruvious/server')
                const { layouts } = await import('#pruvious/layouts')
                const layout: LayoutDefinition = (layouts as any)[input.layout]

                try {
                  if (layout?.allowedBlocks || layout?.allowedRootBlocks) {
                    for await (const { block, path, isNestedPresetBlock } of walkBlocks(value)) {
                      const blockLabel = (blocks as any)[block.name]?.label ?? block.name

                      if (
                        layout.allowedBlocks &&
                        layout.allowedBlocks !== '*' &&
                        !layout.allowedBlocks.includes(block.name)
                      ) {
                        errors[`blocks.${path}`] = __(
                          language,
                          'pruvious-server',
                          "The block '$block' is not allowed in the layout '$layout'",
                          { block: blockLabel, layout: layout.label },
                        )
                      } else if (
                        layout.allowedRootBlocks &&
                        layout.allowedRootBlocks !== '*' &&
                        !isNestedPresetBlock &&
                        !path.includes('.') &&
                        !layout.allowedRootBlocks.includes(block.name)
                      ) {
                        errors[`blocks.${path}`] = __(
                          language,
                          'pruvious-server',
                          "The block '$block' is not allowed as a root block in the layout '$layout'",
                          { block: blockLabel, layout: layout.label },
                        )
                      }
                    }
                  }
                } catch {}
              },
            },
          ],
        },
      },
      ...(options.additionalFields ?? {}),
    },
  }
}
