import { Pruvious } from '#imports'
import {
  SearchableField,
  Size,
  Block as _Block,
  BlockRecord as _BlockRecord,
  ButtonsField as _ButtonsField,
  CheckboxField as _CheckboxField,
  CheckboxesField as _CheckboxesField,
  DateField as _DateField,
  DateTimeField as _DateTimeField,
  EditorField as _EditorField,
  Field as _Field,
  FileField as _FileField,
  IconField as _IconField,
  Image as _Image,
  ImageField as _ImageField,
  ImageSource as _ImageSource,
  Link as _Link,
  LinkField as _LinkField,
  NumberField as _NumberField,
  PageField as _PageField,
  PostField as _PostField,
  PresetField as _PresetField,
  RepeaterField as _RepeaterField,
  RoleField as _RoleField,
  SelectField as _SelectField,
  SizeField as _SizeField,
  SliderField as _SliderField,
  SwitchField as _SwitchField,
  TextAreaField as _TextAreaField,
  TextField as _TextField,
  TimeField as _TimeField,
  UrlField as _UrlField,
  UserField as _UserField,
} from '@pruvious-test/shared'
import { PropType } from 'vue'

export namespace PruviousField {
  export type Block = _Block
  export type BlockRecord = _BlockRecord
  export type Field = _Field
  export type Image = _Image
  export type ImageSource = _ImageSource
  export type Link = _Link
}

type VE = { extend?: Pruvious.FieldStub[] | Pruvious.FieldStub } & {
  validate?: Pruvious.Validator[]
}
type SF = SearchableField
type SNS = string | number | symbol

type ButtonsField<T extends string> = Omit<_ButtonsField<T>, 'type' | 'name'> & VE & SF
type CheckboxesField<T extends string> = Omit<_CheckboxesField<T>, 'type' | 'name'> & VE & SF
type CheckboxField = Omit<_CheckboxField, 'type' | 'name'> & VE
type DateField = Omit<_DateField, 'type' | 'name'> & VE
type DateTimeField = Omit<_DateTimeField, 'type' | 'name'> & VE
type EditorField = Omit<_EditorField, 'type' | 'name'> & VE & SF
type FileField<T extends SNS, U extends SNS> = Omit<_FileField<T, U>, 'type' | 'name'> & VE & SF
type IconField = Omit<_IconField, 'type' | 'name'> & VE & SF
type ImageField = Omit<_ImageField, 'type' | 'name'> & VE & SF
type LinkField = Omit<_LinkField, 'type' | 'name'> & VE & SF
type NumberField = Omit<_NumberField, 'type' | 'name'> & VE & SF
type PageField<T extends SNS, U extends SNS> = Omit<_PageField<T, U>, 'type' | 'name'> & VE & SF
type PostField<T extends any, U extends any> = Omit<_PostField<T, U>, 'type' | 'name'> & VE & SF
type PresetField<T extends SNS, U extends SNS> = Omit<_PresetField<T, U>, 'type' | 'name'> & VE & SF
type RepeaterField<T extends string> = Omit<_RepeaterField<T>, 'type' | 'name'> & VE
type RoleField<T extends SNS, U extends SNS> = Omit<_RoleField<T, U>, 'type' | 'name'> & VE & SF
type SelectField<T extends string> = Omit<_SelectField<T>, 'type' | 'name'> & VE & SF
type SizeField<T extends string, U extends string> = Omit<_SizeField<T, U>, 'type' | 'name'> & VE
type SliderField = Omit<_SliderField, 'type' | 'name'> & VE & SF
type SwitchField = Omit<_SwitchField, 'type' | 'name'> & VE & SF
type TextField = Omit<_TextField, 'type' | 'name'> & VE & SF
type TextAreaField = Omit<_TextAreaField, 'type' | 'name'> & VE & SF
type TimeField = Omit<_TimeField, 'type' | 'name'> & VE
type UrlField = Omit<_UrlField, 'type' | 'name'> & VE & SF
type UserField<T extends SNS, U extends SNS> = Omit<_UserField<T, U>, 'type' | 'name'> & VE & SF

export function buttonsField<ChoiceValue extends string>(config?: ButtonsField<ChoiceValue>) {
  return String as unknown as PropType<ChoiceValue>
}

export function checkboxesField<ChoiceValue extends string>(config?: CheckboxesField<ChoiceValue>) {
  return Array as unknown as PropType<ChoiceValue[]>
}

export function checkboxField(config?: CheckboxField) {
  return Boolean
}

export function dateField(config?: DateField) {
  return String
}

export function dateTimeField(config?: DateTimeField) {
  return String
}

export function editorField(config?: EditorField) {
  return String
}

export function fileField<ReturnFieldName extends keyof Pruvious.Upload = 'id' | 'url'>(
  config?: FileField<keyof Pruvious.Upload, ReturnFieldName>,
) {
  return Object as unknown as PropType<Pick<Pruvious.Upload, ReturnFieldName>>
}

export function imageField(config?: ImageField) {
  return Object as PropType<PruviousField.Image | null>
}

export function numberField(config?: NumberField) {
  return Number
}

export function pageField<ReturnFieldName extends keyof Pruvious.Page = 'id' | 'title' | 'path'>(
  config?: PageField<keyof Pruvious.Page, ReturnFieldName>,
) {
  return Object as unknown as PropType<Pick<Pruvious.Page, ReturnFieldName>>
}

export function postField<
  CollectionName extends keyof Pruvious.Post,
  ReturnFieldName extends keyof Pruvious.Post[CollectionName] = 'id',
>(
  config: PostField<keyof Pruvious.Post[CollectionName], ReturnFieldName> & {
    collection: CollectionName
  },
): PropType<Pick<Pruvious.Post[CollectionName], ReturnFieldName>> {
  return Object as unknown as PropType<Pick<Pruvious.Post[CollectionName], ReturnFieldName>>
}

export function presetField<ReturnFieldName extends keyof Pruvious.Preset = 'id' | 'blocks'>(
  config?: PresetField<keyof Pruvious.Preset, ReturnFieldName>,
) {
  return Object as unknown as PropType<Pick<Pruvious.Preset, ReturnFieldName>>
}

export function linkField(config?: LinkField) {
  return Object as PropType<PruviousField.Link | null>
}

export function iconField(config?: IconField) {
  return String
}

export function repeaterField<SubField extends { [subFieldName: string]: any }>(
  config: RepeaterField<Extract<keyof SubField, string>>,
) {
  return Array as unknown as PropType<SubField[]>
}

export function roleField<
  ReturnFieldName extends keyof Pruvious.Role = 'id' | 'name' | 'capabilities',
>(config?: RoleField<keyof Pruvious.Role, ReturnFieldName>) {
  return Object as unknown as PropType<Pick<Pruvious.Role, ReturnFieldName>>
}

export function selectField<ChoiceValue extends string>(config?: SelectField<ChoiceValue>) {
  return String as unknown as PropType<ChoiceValue>
}

export function sizeField<Name extends string = 'width' | 'height', Unit extends string = never>(
  config?: SizeField<Name, Unit>,
) {
  return Object as unknown as PropType<Record<Name, Size<Unit>>>
}

export function sliderField(config?: SliderField) {
  return Number
}

export function switchField(config?: SwitchField) {
  return Boolean
}

export function textAreaField(config?: TextAreaField) {
  return String
}

export function textField(config?: TextField) {
  return String
}

export function timeField(config?: TimeField) {
  return String
}

export function urlField(config?: UrlField) {
  return String
}

export function userField<ReturnFieldName extends keyof Pruvious.User = 'id' | 'email'>(
  config?: UserField<keyof Pruvious.User, ReturnFieldName>,
) {
  return Object as unknown as PropType<Pick<Pruvious.User, ReturnFieldName>>
}
