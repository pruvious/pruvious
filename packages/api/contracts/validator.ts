import { ConditionalLogic, Field, FieldGroup, PageRecord } from '@pruvious/shared'
import { LanguageType } from 'App/translations'

declare module '@ioc:Adonis/Core/Validator' {
  interface Rules {
    pathPart(): Rule
    pagePath(id: number): Rule
    pageType(): Rule
    pageLayout(type: string): Rule
    blockRecords(
      conditionalLogic: ConditionalLogic,
      forbiddenBlocks?: string[],
      draft?: boolean,
    ): Rule
    allowedPageBlocks(page: Partial<PageRecord>): Rule
    allowedPresetBlocks(): Rule
    fieldRecords(
      fields: (Field | FieldGroup)[],
      conditionalLogic: ConditionalLogic,
      model?: 'page' | 'upload' | 'post' | 'user',
      modelId?: number,
      language?: string,
      draft?: boolean,
      collection?: string,
    ): Rule
    language(): Rule
    translationOf(model: LanguageType, language?: string): Rule
    capability(): Rule
    destroyMany(): Rule
    redirect(): Rule
  }
}
