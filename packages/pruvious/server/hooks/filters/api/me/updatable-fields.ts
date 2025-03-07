import type { Collections, FieldsLayout } from '#pruvious/server'
import { defineFilter } from '#pruvious/server'

export interface MyAccountFields {
  /**
   * The fields that any active user can update on their own account when they have the `update-account` permission.
   *
   * @default
   * [
   *   'password',
   *   'firstName',
   *   'lastName',
   *   'contentLanguage',
   *   'dashboardLanguage',
   *   'dateFormat',
   *   'timeFormat',
   * ]
   */
  fields: (keyof Collections['Users']['fields'])[]

  /**
   * Customizes the layout of the collection's fields in the dashboard.
   * If not specified, the fields are stacked vertically in the order they are defined.
   *
   * @default
   * [
   *   { row: ['firstName', 'lastName'] },
   *   { row: ['contentLanguage', 'dashboardLanguage'] },
   *   { row: ['dateFormat', 'timeFormat'] },
   *   '---',
   *   'password',
   * ]
   */
  layout: FieldsLayout<keyof Collections['Users']['fields']> | undefined
}

export function defaultMyAccountFields(): MyAccountFields {
  return {
    fields: ['password', 'firstName', 'lastName', 'contentLanguage', 'dashboardLanguage', 'dateFormat', 'timeFormat'],
    layout: [
      { row: ['firstName', 'lastName'] },
      { row: ['contentLanguage', 'dashboardLanguage'] },
      { row: ['dateFormat', 'timeFormat'] },
      '---',
      'password',
    ],
  }
}

export default defineFilter<MyAccountFields>()
