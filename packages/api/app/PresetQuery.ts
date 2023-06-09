import { validator } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import {
  CFields,
  QueryStringParameters,
  ReturnOptions,
  SFields,
  UFields,
  UpdateResult,
  ValidationError,
  ValidationResults,
  standardPresetColumns,
  standardPresetFields,
} from '@pruvious-test/shared'
import { Pruvious } from '@pruvious-test/types'
import Preset from 'App/Models/Preset'
import Translation from 'App/Models/Translation'
import PresetValidator from 'App/Validators/PresetValidator'
import { config, presetConfig } from 'App/imports'
import { populatePreset } from 'App/populator'
import { getTranslations } from 'App/translations'
import { BaseQuery, prepareFieldValue } from './BaseQuery'
import { addInternalJob } from './worker'

type PresetResult = SFields<
  Pruvious.Preset,
  Pruvious.PresetInput,
  Pruvious.SelectablePresetField | Pruvious.ComputedPresetField
>

type QueryString = QueryStringParameters<{
  LanguageCode: Pruvious.LanguageCode
  Model: Pruvious.PresetInput
  SelectableField: Pruvious.SelectablePresetField
  SortableField: Pruvious.SortablePresetField
  FilterableField: Pruvious.FilterablePresetField
  StringField: Pruvious.PresetStringField
  NumberField: Pruvious.PresetNumberField
  BooleanField: Pruvious.PresetBooleanField
}>

type T = {
  Input: Pruvious.PresetInput
  Result: PresetResult
  PopulatedResult: Pruvious.Preset
  ComputedField: Pruvious.ComputedPresetField
  SelectableField: Pruvious.SelectablePresetField
  SortableField: Pruvious.SortablePresetField
  FilterableField: Pruvious.FilterablePresetField
  StringField: Pruvious.PresetStringField
  NumberField: Pruvious.PresetNumberField
  BooleanField: Pruvious.PresetBooleanField
  LanguageCode: Pruvious.LanguageCode
}

export class PresetQuery extends BaseQuery<T> {
  constructor(params?: string | QueryString) {
    super()

    this.table = 'presets'

    this.query = Preset.query()

    this.columns = standardPresetColumns

    this.fields.push(...standardPresetFields)

    this.relations.push('translations')

    this.createHook = presetConfig.onCreate
    this.readHook = presetConfig.onRead
    this.populateHook = presetConfig.onPopulate
    this.updateHook = presetConfig.onUpdate
    this.deleteHook = presetConfig.onDelete

    if (presetConfig.listing?.perPage) {
      this.perPage = presetConfig.listing.perPage
    }

    if (presetConfig.perPageLimit) {
      this.perPageLimit = presetConfig.perPageLimit
    }

    if (typeof params === 'string') {
      this.fromQueryString(params)
    } else if (typeof params === 'object') {
      this.apply(params)
    }
  }

  /**
   * Apply filters, selected fields, locales, and sort and pagination parameters from a query string `value`.
   *
   * @example
   * ```js
   * await queryPresets().fromQueryString('sort=createdAt:desc&filters[title][$startsWith]=form:')
   *
   * // Alternative 1:
   * await queryPresets().apply({ sort: 'createdAt:desc', filters: { title: { $startsWith: 'form:' } } })
   *
   * // Alternative 2:
   * await queryPresets().whereLike('title', 'form:%').orderBy('createdAt', 'desc')
   * ```
   */
  fromQueryString(value: string): this {
    return super.fromQueryString(value)
  }

  /**
   * Apply filters, selected fields, locales, and sort and pagination parameters from parsed query string `params`.
   *
   * @example
   * ```js
   * await queryPresets().apply({ sort: 'createdAt:desc', filters: { title: { $startsWith: 'form:' } } })
   *
   * // Alternative 1:
   * await queryPresets().fromQueryString('sort=createdAt:desc&filters[title][$startsWith]=form:')
   *
   * // Alternative 2:
   * await queryPresets().whereLike('title', 'form:%').orderBy('createdAt', 'desc')
   * ```
   */
  apply(
    params: QueryStringParameters<{
      LanguageCode: T['LanguageCode']
      Model: T['Input']
      SelectableField: T['SelectableField']
      SortableField: T['SortableField']
      FilterableField: T['FilterableField']
      StringField: T['StringField']
      NumberField: T['NumberField']
      BooleanField: T['BooleanField']
    }>,
  ): this {
    return super.apply(params)
  }

  /**
   * Return presets for a specific language `code`.
   *
   * @example
   * ```js
   * await queryPresets().language('de').all() // Returns all presets in German
   * await queryPresets().language('*').all() // Returns all presets
   * ```
   */
  language(code: Pruvious.LanguageCode | '*'): this {
    return this.setLanguage(code)
  }

  /**
   * An array of field names that will be returned in the query results.
   * Use a wildcard (*) to select all fields.
   *
   * @example
   * ```js
   * await queryPresets().select('id', 'title').all()
   * // [{ id: 1, path: 'Newsletter teaser' }]
   * ```
   */
  select(...fields: (T['SelectableField'] | '*')[]): this {
    return super.select(...fields)
  }

  protected async populateRecord(preset: PresetResult) {
    await populatePreset(preset as any, this._skipPopulate)
  }

  /**
   * Retrieve a preset by its ID.
   *
   * @example
   * ```js
   * await queryPresets().find(1)
   * ```
   */
  async find(id: number): Promise<PresetResult | null> {
    const preset = await Preset.find(id)
    return preset ? await this.serialize(preset) : null
  }

  /**
   * Find a preset based on a specific field-value pair.
   *
   * @example
   * ```js
   * await queryPresets().findBy('title', 'Newsletter teaser')
   * ```
   */
  async findBy<FieldName extends Pruvious.FilterablePresetField>(
    field: FieldName,
    value: Exclude<Pruvious.PresetInput[FieldName], null>,
  ): Promise<PresetResult | null> {
    const presets = await this.$where('', 'and', field, value, Preset.query())
      .orderBy('id', 'desc')
      .limit(1)

    return presets.length ? await this.serialize(presets[0]) : null
  }

  /**
   * Define a `where` clause in SQL queries by specifying a field name and a corresponding value to filter the query results.
   *
   * @example
   * ```js
   * await queryPresets().where('title', 'Newsletter teaser').first()
   * ```
   */
  where<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.where(field, value)
  }

  /**
   * Refine the `where` clause in SQL queries using the `AND` operator by specifying a field name and a corresponding value to filter the query results.
   *
   * @alias where
   * @example
   * ```js
   * await queryPresets().where('title', 'Newsletter teaser').andWhere('updatedAt', '2023-01-01').first()
   * ```
   */
  andWhere<
    FieldName extends T['FilterableField'] &
      (T['StringField'] | T['NumberField'] | T['BooleanField']),
  >(field: FieldName, value: Exclude<T['Input'][FieldName], null>): this {
    return super.andWhere(field, value)
  }

  protected async _create(
    fields: CFields<
      Pruvious.PresetInput,
      Pruvious.CreatablePresetField,
      Pruvious.RequiredPresetField
    >,
  ): Promise<
    { success: true; data: PresetResult } | { success: false; errors: ValidationError[] }
  > {
    if (this.createHook) {
      await this.createHook(fields)
    }

    const validationResults = await validatePresetFields(fields)

    if (validationResults.success) {
      let translationId: number | undefined

      const records = validationResults.data

      if (records.translationOf) {
        const translationOf = await Database.from(this.table)
          .select('translation_id')
          .where('id', records.translationOf)
          .first()

        if (translationOf) {
          translationId = translationOf.translation_id
        }
      }

      const preset = await Preset.create({
        language: prepareFieldValue(records.language, config.defaultLanguage).trim(),
        translationId: translationId || (await Translation.create({})).id,
        title: records.title.trim(),
        blocks: prepareFieldValue(records.blocks, []),
        blocksBackup: null,
      })

      await preset.refresh()
      await preset.safeRebuildRelations()
      await addInternalJob('flush', 'Preset', preset.id)

      return { success: true, data: await this.serialize(preset) }
    }

    return validationResults
  }

  /**
   * Update the selected presets.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async update(
    fields: UFields<Pruvious.PresetInput, Pruvious.UpdateablePresetField>,
  ): Promise<UpdateResult<PresetResult>[]> {
    const results: UpdateResult<PresetResult>[] = []
    const presets: Preset[] = await this.prepare().exec()

    if (this.updateHook) {
      await this.updateHook(fields)
    }

    for (const preset of presets) {
      const fieldsToValidate = { ...fields, id: preset.id }

      for (const column of Object.keys(this.columns)) {
        if (fieldsToValidate[column] === undefined) {
          fieldsToValidate[column] = preset[column]
        }
      }

      const validationResults = await validatePresetFields(fieldsToValidate, 'update')

      if (validationResults.success) {
        const records = validationResults.data

        preset.merge({
          title: prepareFieldValue(records.title, preset.title),
          blocks: prepareFieldValue(records.blocks, preset.blocks),
          blocksBackup: null,
        })

        await preset.save()
        await preset.refresh()

        await preset.safeRebuildRelations()
        await addInternalJob('flush', 'Preset', preset.id)

        results.push({
          success: true,
          data: await this.serialize(preset),
        })
      } else {
        results.push({
          success: false,
          data: await this.serialize(preset),
          errors: validationResults.errors,
        })
      }
    }

    return results
  }

  /**
   * Delete the selected presets.
   *
   * @example
   * ```js
   * @todo
   * ```
   */
  async delete(): Promise<number[]> {
    const deleted: number[] = []
    const presets: Preset[] = await this.prepare().exec()

    for (const preset of presets) {
      if (this.deleteHook) {
        await this.deleteHook(preset.id)
      }

      await preset.$relation('translation')

      const translation = preset.translation

      await preset.delete()
      await translation.load('presets')

      if (!translation.presets.length) {
        await translation.delete()
      }

      deleted.push(preset.id)
    }

    return deleted
  }
}

/**
 * Create a query builder instance for presets.
 *
 * @todo example
 */
export function queryPresets(params?: string | QueryString): PresetQuery {
  return new PresetQuery(params)
}

/**
 * Validate preset field inputs.
 *
 * Default mode is `create`.
 *
 * @example
 * ```js
 * @todo
 * ```
 */
export async function validatePresetFields(
  fields: Partial<Pruvious.PresetInput>,
  mode: 'create' | 'update' = 'create',
): Promise<ValidationResults> {
  const data: Record<string, any> = {}

  standardPresetFields.forEach((field) => {
    if (fields[field.name] !== undefined) {
      data[field.name] = fields[field.name]
    }
  })

  if (mode === 'create' && fields.translationOf) {
    data.translationOf = fields.translationOf
  }

  try {
    return {
      success: true,
      data: await validator.validate(
        new PresetValidator(data, mode, mode === 'update' ? data.id : undefined),
      ),
    }
  } catch (e) {
    return {
      success: false,
      errors: Object.entries(e.messages).map(([field, messages]: [string, string[]]) => ({
        field,
        message: messages[0],
      })),
    }
  }
}

/**
 * Create a new preset.
 *
 * @example
 * ```js
 * await createPreset({}) @todo
 * ```
 */
export async function createPreset(
  fields: CFields<
    Pruvious.PresetInput,
    Pruvious.CreatablePresetField,
    Pruvious.RequiredPresetField
  >,
  returnOptions?: ReturnOptions<Pruvious.ComputedPresetField>,
): Promise<{ success: true; data: PresetResult } | { success: false; errors: ValidationError[] }> {
  const query = queryPresets()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  return (query as any)._create(fields)
}

/**
 * Fetch a preset based on its ID.
 *
 * @example
 * ```js
 * await getPreset(1) @todo
 * ```
 */
export async function getPreset(
  presetId: number,
  returnOptions?: ReturnOptions<Pruvious.ComputedPresetField>,
): Promise<PresetResult | null> {
  const query = queryPresets()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', presetId)

  if (returnOptions?.populate !== false) {
    query.populate()

    if ((returnOptions as any)?._skipPopulate) {
      ;(query as any)._skipPopulate = (returnOptions as any)._skipPopulate
    }
  }

  return query.first()
}

/**
 * Update a preset based on its ID.
 *
 * Returns `null` if the preset does not exist.
 *
 * @example
 * ```js
 * await updatePreset(1, {}) @todo
 * ```
 */
export async function updatePreset(
  presetId: number,
  fields: UFields<Pruvious.PresetInput, Pruvious.UpdateablePresetField>,
  returnOptions?: ReturnOptions<Pruvious.ComputedPresetField>,
): Promise<UpdateResult<PresetResult> | null> {
  const query = queryPresets()
    .select(...(Array.isArray(returnOptions?.fields) ? (returnOptions!.fields as any) : ['*']))
    .language('*')
    .with(...((Array.isArray(returnOptions?.with) ? returnOptions!.with : ['*']) as any))
    .where('id', presetId)

  if (returnOptions?.populate !== false) {
    query.populate()
  }

  const results = await query.update(fields)

  return results[0] ?? null
}

/**
 * Delete a preset based on its ID.
 *
 * @example
 * ```js
 * await deletePreset(1) @todo
 * ```
 */
export async function deletePreset(presetId: number): Promise<boolean> {
  const results = await queryPresets().language('*').where('id', presetId).delete()
  return !!results.length
}

/**
 * @todo
 */
export async function getPresetTranslations(
  presetId: number,
): Promise<Record<string, { id: number } | null>> {
  return (await getTranslations('presets', presetId, true)) as any
}
