import type { GenericField } from '@pruvious/orm'
import type {
  BaseAuthorFieldOptions,
  BaseCreatedAtFieldOptions,
  BaseEditorsFieldOptions,
  BaseIsPublicFieldOptions,
  BaseUpdatedAtFieldOptions,
  CollectionRoutingOptions,
  DefineCollectionOptions,
  PublicRoutingFieldNames,
} from '../collections/define'
import {
  type AuthorFieldPresetOptions,
  type CreatedAtFieldPresetOptions,
  type EditorsFieldPresetOptions,
  type IsPublicFieldPresetOptions,
  type ScheduledAtFieldPresetOptions,
  type SEOFieldPresetOptions,
  type UpdatedAtFieldPresetOptions,
} from '../fields/presets'

/**
 * Creates a template that can be used as a base for defining Pruvious collections.
 * This function receives a single parameter:
 *
 * - `factory` - A function that returns the base collection options.
 *
 * Use this as the default export in a file within the `server/templates/` directory.
 * The filename determines the template name, which should be in PascalCase (e.g. 'Articles.ts', 'ArticleCategories.ts', etc.).
 *
 * @see https://pruvious.com/docs/collection-templates (@todo set up this link)
 *
 * @example
 * ```ts
 * // server/templates/Animals.ts
 * import { defineTemplate } from '#pruvious/server'
 *
 * export default defineTemplate(() => ({
 *   fields: {
 *     name: textField({ required: true }),
 *   },
 * }))
 *
 * // server/collections/Dogs.ts
 * import { defineCollectionFromTemplate, textField } from '#pruvious/server'
 *
 * export default defineCollectionFromTemplate('Animals', (template) => ({
 *   ...template,
 *   fields: {
 *     ...template.fields,
 *     breed: textField({ required: true }),
 *   },
 * }))
 * ```
 */
export function defineTemplate<
  const TFields extends Record<string, GenericField>,
  const TTranslatable extends boolean | undefined,
  const TCreatedAt extends boolean | (CreatedAtFieldPresetOptions & BaseCreatedAtFieldOptions) | undefined,
  const TUpdatedAt extends boolean | (UpdatedAtFieldPresetOptions & BaseUpdatedAtFieldOptions) | undefined,
  const TAuthor extends boolean | (AuthorFieldPresetOptions & BaseAuthorFieldOptions) | undefined,
  const TEditors extends boolean | (EditorsFieldPresetOptions & BaseEditorsFieldOptions) | undefined,
  const TIsPublic extends boolean | (IsPublicFieldPresetOptions & BaseIsPublicFieldOptions) | undefined,
  const TScheduledAt extends boolean | ScheduledAtFieldPresetOptions | undefined,
  const TSEO extends boolean | SEOFieldPresetOptions | undefined,
  const TRouting extends
    | boolean
    | CollectionRoutingOptions<
        PublicRoutingFieldNames<
          TFields,
          TTranslatable,
          TCreatedAt,
          TUpdatedAt,
          TAuthor,
          TEditors,
          TIsPublic,
          TScheduledAt,
          TSEO
        >,
        TIsPublic,
        TScheduledAt,
        TSEO
      >
    | undefined,
>(
  factory: () => DefineCollectionOptions<
    TFields,
    TTranslatable,
    TCreatedAt,
    TUpdatedAt,
    TAuthor,
    TEditors,
    TIsPublic,
    TScheduledAt,
    TSEO,
    TRouting
  >,
): () => DefineCollectionOptions<
  TFields,
  TTranslatable,
  TCreatedAt,
  TUpdatedAt,
  TAuthor,
  TEditors,
  TIsPublic,
  TScheduledAt,
  TSEO,
  TRouting
> {
  return factory
}
