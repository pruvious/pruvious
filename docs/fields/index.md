# Field reference

Every field type Pruvious ships with. Each entry includes the import, a quick example, and the options most specific to that field. For options shared by every field (`default`, `required`, `unique`, `sanitizers`, `validators`, `conditionalLogic`, `ui`, etc.) see the [Fields essentials](../essentials/fields.md).

All fields are imported from `#pruvious/server` for collection and singleton definitions, and from `#pruvious/app` for use inside block definitions.

## At a glance

| Group | Fields |
| --- | --- |
| [Text](#text) | `textField`, `textAreaField`, `nullableTextField`, `translatableTextField`, `editorField`, `richTextField` |
| [Numbers](#numbers) | `numberField` |
| [Booleans](#booleans) | `switchField`, `checkboxField`, `trueFalseField` |
| [Choices](#choices) | `selectField`, `nullableSelectField`, `buttonGroupField`, `chipsField`, `colorField`, `nullableColorField` |
| [Date and time](#date-and-time) | `dateField`, `dateRangeField`, `dateTimeField`, `dateTimeRangeField`, `timeField`, `timeRangeField`, `timestampField` |
| [Media](#media) | `imageField`, `imagesField`, `fileField`, `filesField`, `iconField` |
| [Relations](#relations) | `recordField`, `recordsField`, `linkField`, `linkedBlocksField`, `blocksField` |
| [Structure](#structure) | `objectField`, `nullableObjectField`, `repeaterField`, `structureField` |
| [Routing and i18n](#routing-and-i18n) | `subpathField`, `languageField`, `translationsField` |

## Text

### textField

A single-line text input stored as `TEXT`. Trims input by default.

```ts
import { textField } from '#pruvious/server'

textField({
  required: true,
  minLength: 1,
  maxLength: 120,
  ui: {
    label: ({ __ }) => __('pruvious-dashboard', 'Title'),
    placeholder: 'Untitled',
  },
})
```

**Specific options:** `minLength`, `maxLength`, `trim`, `allowEmptyString`.

### textAreaField

A multi-line text input. Allows line breaks by default and can auto-resize.

```ts
import { textAreaField } from '#pruvious/server'

textAreaField({
  allowLineBreaks: true,
  ui: {
    rows: 4,
    resize: 'auto',
    label: 'Bio',
  },
})
```

**Specific options:** `allowLineBreaks`, `ui.rows`, `ui.resize` (`false | 'manual' | 'auto'`).

### nullableTextField

A text input that can be explicitly `null`. The dashboard renders an extra switch to toggle between "off" (null) and "on" (string value).

```ts
import { nullableTextField } from '#pruvious/server'

nullableTextField({
  default: null,
  ui: {
    label: 'Nickname',
    switch: {
      offLabel: ({ __ }) => __('pruvious-dashboard', 'No nickname'),
      onLabel: ({ __ }) => __('pruvious-dashboard', 'Custom'),
    },
  },
})
```

**Specific options:** `ui.switch.offLabel`, `ui.switch.onLabel`, `ui.switch.variant`.

### translatableTextField

A text value stored as `{ [languageCode]: string }`. Edited in one input per configured language; on read, populates to the current request language.

```ts
import { translatableTextField } from '#pruvious/server'

translatableTextField({
  required: true,
  maxLength: 200,
  ui: { label: 'Subtitle' },
})
```

**Specific options:** `minLength`, `maxLength`, `trim`, `allowLineBreaks`, `allowEmptyString`.

### editorField

A block-based WYSIWYG editor that produces sanitized HTML (paragraphs, headings, lists, blockquote, code block, hr). Supports custom marks and a configurable toolbar.

```ts
import { editorField } from '#pruvious/server'

editorField({
  blocks: ['paragraph', 'h2', 'h3', 'bulletList'],
  marks: {
    highlight: {
      tag: 'span',
      attrs: { class: 'highlight' },
      shortcut: 'Mod-h',
      icon: 'highlight',
      label: ({ __ }) => __('pruvious-dashboard', 'Highlight'),
    },
  },
  links: { allowExternal: false, allowedReferences: ['Articles'] },
  ui: { toolbar: 'auto' },
})
```

**Specific options:** `blocks`, `marks`, `links`, `normalizeWhitespace`, `ui.toolbar`.

### richTextField

An inline rich-text field for use inside block live-editing. Stores a fragment of HTML with marks and optional links. Designed to plug into Pruvious blocks rather than full documents.

```ts
import { richTextField } from '#pruvious/server'

richTextField({
  allowLineBreaks: true,
  marks: { bold: { tag: 'strong', shortcut: 'Mod-b', icon: 'bold' } },
  links: true,
  ui: {
    liveEditor: {
      mergeGroups: ['body'],
      forwardSlashOpensBlockPicker: true,
    },
  },
})
```

**Specific options:** `allowLineBreaks`, `marks`, `links`, `ui.liveEditor.formatters`, `ui.liveEditor.mergeGroups`.

## Numbers

### numberField

A numeric input stored as `NUMERIC`. Supports decimals, min/max bounds, and dashboard helpers like steppers and a drag handle.

```ts
import { numberField } from '#pruvious/server'

numberField({
  min: 0,
  max: 100,
  decimalPlaces: 2,
  ui: { showSteppers: true, suffix: ' %' },
})
```

**Specific options:** `min`, `max`, `decimalPlaces`, `ui.showSteppers`, `ui.showDragButton`, `ui.padZeros`.

## Booleans

### switchField

A boolean rendered as a toggle switch with a label on the side.

```ts
import { switchField } from '#pruvious/server'

switchField({
  default: false,
  ui: {
    label: 'Newsletter',
    fieldLabel: ({ __ }) => __('pruvious-dashboard', 'Subscribe to newsletter'),
  },
})
```

**Specific options:** `ui.variant` (`'primary' | 'accent'`), `ui.fieldLabel`.

### checkboxField

The same boolean storage as `switchField`, rendered as a checkbox in the dashboard. Useful for compact, list-like settings.

```ts
import { checkboxField } from '#pruvious/server'

checkboxField({
  default: true,
  ui: { label: 'Show in menu' },
})
```

**Specific options:** `ui.variant`, `ui.fieldLabel`.

### trueFalseField

A two-state segmented control with custom Yes/No labels. Better than a switch when both states deserve a name.

```ts
import { trueFalseField } from '#pruvious/server'

trueFalseField({
  default: true,
  ui: {
    yesLabel: ({ __ }) => __('pruvious-dashboard', 'Public'),
    noLabel: ({ __ }) => __('pruvious-dashboard', 'Draft'),
  },
})
```

**Specific options:** `ui.yesLabel`, `ui.noLabel`, `ui.variant`.

## Choices

### selectField

A dropdown of mutually exclusive choices. Choice values are inferred into the field's TypeScript type. Supports flat lists or grouped choices.

```ts
import { selectField } from '#pruvious/server'

selectField({
  choices: [
    { value: 'draft', label: ({ __ }) => __('pruvious-dashboard', 'Draft') },
    { value: 'published', label: 'Published' },
  ],
  default: 'draft',
})
```

**Specific options:** `choices` (array of `{ value, label? }` or grouped `{ group, choices }`).

### nullableSelectField

A select that allows clearing back to `null`. The first option is reserved for the empty state.

```ts
import { nullableSelectField } from '#pruvious/server'

nullableSelectField({
  choices: [
    { value: 'eur', label: 'EUR' },
    { value: 'usd', label: 'USD' },
  ],
  ui: {
    nullChoiceLabel: ({ __ }) => __('pruvious-dashboard', 'No currency'),
    nullChoiceMuted: true,
  },
})
```

**Specific options:** `choices`, `ui.nullChoiceLabel`, `ui.nullChoiceMuted`.

### buttonGroupField

A row of buttons - functionally a select but rendered inline. Best for small, fixed sets like sizes or alignment.

```ts
import { buttonGroupField } from '#pruvious/server'

buttonGroupField({
  choices: [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ],
  default: 'left',
})
```

**Specific options:** `choices`.

### chipsField

An array of short string values, entered as chips. Can be free-form text or constrained to a fixed list.

```ts
import { chipsField } from '#pruvious/server'

chipsField({
  choices: false, // free entry
  enforceUniqueItems: true,
  ui: { variant: 'accent' },
})
```

**Specific options:** `choices`, `enforceUniqueItems`, `trim`, `ui.variant`.

### colorField

A swatch picker over a configured CSS color palette. Each choice is a CSS color string or `{ value, label?, populate? }`; choices can be grouped under translatable group labels. Casted value is one of the configured strings; populated value is the choice's `populate` if set, otherwise the casted value.

```ts
import { colorField } from '#pruvious/server'

colorField({
  colors: [
    '#ff0000',
    { label: 'Brand green', value: '#00ff00' },
    { value: '#0000ff', populate: { name: 'blue', rgb: [0, 0, 255] } },
    {
      group: ({ __ }) => __('pruvious-dashboard', 'Brand'),
      colors: ['#e11d48', '#2563eb'],
    },
  ],
})
```

**Specific options:** `colors`.

### nullableColorField

Same as `colorField` but the value can be cleared back to `null`. The dashboard renders a Clear button next to the swatches whenever a value is selected.

```ts
import { nullableColorField } from '#pruvious/server'

nullableColorField({
  colors: ['#ff0000', '#00ff00', '#0000ff'],
  default: null,
})
```

**Specific options:** `colors`.

## Date and time

### dateField

A calendar input. Stores a UTC-midnight millisecond timestamp.

```ts
import { dateField } from '#pruvious/server'

dateField({
  min: '2024-01-01',
  max: '2030-12-31',
  ui: { startDay: 1, icon: 'calendar-week' },
})
```

**Specific options:** `min`, `max`, `ui.startDay`, `ui.icon`, `ui.clearable`, `ui.initial`.

### dateRangeField

A start/end pair of dates with optional min/max span constraints.

```ts
import { dateRangeField } from '#pruvious/server'

dateRangeField({
  minRange: '1 day',
  maxRange: { days: 30 },
  ui: {
    decorator: 'left',
    iconFrom: 'calendar-down',
    iconTo: 'calendar-up',
  },
})
```

**Specific options:** `min`, `max`, `minRange`, `maxRange`, `ui.decorator`, `ui.iconFrom`, `ui.iconTo`.

### dateTimeField

A date plus a time-of-day input. Stores the combined UTC-second-precision millisecond timestamp.

```ts
import { dateTimeField } from '#pruvious/server'

dateTimeField({
  ui: {
    showSeconds: false,
    timezone: 'Europe/Berlin',
    relativeTime: true,
  },
})
```

**Specific options:** `min`, `max`, `ui.showSeconds`, `ui.timezone`, `ui.relativeTime`.

### dateTimeRangeField

A range of two date-times with optional `minRange`/`maxRange` durations.

```ts
import { dateTimeRangeField } from '#pruvious/server'

dateTimeRangeField({
  minRange: '30 minutes',
  ui: { decorator: 'left' },
})
```

**Specific options:** `min`, `max`, `minRange`, `maxRange`, `ui.timezone`, `ui.showSeconds`.

### timeField

A time-of-day picker, stored as milliseconds since midnight.

```ts
import { timeField } from '#pruvious/server'

timeField({
  min: '09:00',
  max: '17:00',
  ui: { showSeconds: false },
})
```

**Specific options:** `min`, `max`, `ui.showSeconds`.

### timeRangeField

A pair of times within a day, with span constraints.

```ts
import { timeRangeField } from '#pruvious/server'

timeRangeField({
  minRange: '1 hour',
  maxRange: '8 hours',
})
```

**Specific options:** `min`, `max`, `minRange`, `maxRange`.

### timestampField

A millisecond timestamp without any presentational opinions. Backs the `createdAt`/`updatedAt` presets. Supports three pickers: calendar, numeric, or both.

```ts
import { timestampField } from '#pruvious/server'

timestampField({
  ui: {
    picker: 'combo',
    relativeTime: true,
    calendar: { showSeconds: true, startDay: 1 },
  },
})
```

**Specific options:** `min`, `max`, `ui.picker` (`'calendar' | 'combo' | 'numeric'`), `ui.relativeTime`, `ui.calendar.timezone`.

## Media

### imageField

A reference to a single image in the `Uploads` collection. Populates to a record from `Uploads` with the requested fields.

```ts
import { imageField } from '#pruvious/server'

imageField({
  required: true,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: '5 MB',
  minWidth: 1200,
  fields: ['id', 'path', 'description'],
  ui: {
    selectLabel: ({ __ }) => __('pruvious-dashboard', 'Pick cover'),
  },
})
```

**Specific options:** `allowedTypes`, `minSize`, `maxSize`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `fields`, `populate`, `foreignKey`.

### imagesField

The plural of `imageField` - an ordered list of image references.

```ts
import { imagesField } from '#pruvious/server'

imagesField({
  minItems: 1,
  maxItems: 12,
  allowedTypes: ['image/jpeg', 'image/png'],
  fields: ['id', 'path', 'imageWidth', 'imageHeight'],
})
```

**Specific options:** `minItems`, `maxItems`, `allowedTypes`, `minSize`, `maxSize`, `min/maxWidth`, `min/maxHeight`.

### fileField

A reference to a single non-image upload. Accepts MIME types or media category shorthands (`'image'`, `'video'`, `'audio'`, `'document'`, `'archive'`).

```ts
import { fileField } from '#pruvious/server'

fileField({
  allowedTypes: ['document'],
  maxSize: '20 MB',
  fields: ['id', 'path', 'mime', 'size'],
})
```

**Specific options:** `allowedTypes`, `minSize`, `maxSize`, `fields`, `populate`, `foreignKey`.

### filesField

The plural of `fileField` - an ordered list of file references.

```ts
import { filesField } from '#pruvious/server'

filesField({
  allowedTypes: ['document', 'archive'],
  maxItems: 5,
})
```

**Specific options:** `allowedTypes`, `minSize`, `maxSize`, `minItems`, `maxItems`.

### iconField

A nullable string referencing an `.svg` file in one of the directories configured via `pruvious.dir.icons` (defaults to `'icons'`). Render values on the frontend with `<PruviousIcon name="..." />` (or `<PruviousIconImage>` for an `<img>` tag).

```ts
import { iconField } from '#pruvious/server'

iconField({
  dir: 'brand-icons',
  ui: { columns: 8, background: 'auto' },
})
```

**Specific options:** `dir`, `ui.columns`, `ui.background` (`'light' | 'dark' | 'auto'`).

## Relations

### recordField

A reference to a single record in another collection by `id`. Populates to a row with the chosen fields.

```ts
import { recordField } from '#pruvious/server'

recordField({
  collection: 'Articles',
  fields: ['id', 'title', 'subpath'],
  populate: true,
  ui: {
    displayFields: ['title', 'subpath'],
    searchFields: ['title'],
  },
})
```

**Specific options:** `collection`, `fields`, `populate`, `foreignKey`, `ui.displayFields`, `ui.searchFields`, `ui.languages`.

### recordsField

A many-to-many reference. Stores a junction array of IDs from another collection. Optionally bidirectional via `inverseField`.

```ts
import { recordsField } from '#pruvious/server'

recordsField({
  collection: 'Tags',
  fields: ['id', 'name'],
  inverseField: 'articles',
  ui: { displayFields: 'name', searchFields: 'name' },
})
```

**Specific options:** `collection`, `fields`, `inverseField`, `populate`, `ui.displayFields`, `ui.searchFields`.

### linkField

A URL with optional `target` and `rel` attributes. Supports external URLs (`https://`) and internal `rel://` links. Populates to `{ url, target, rel }` where `url` is resolved to a real absolute or relative path.

```ts
import { linkField } from '#pruvious/server'

linkField({
  allowExternal: true,
  allowDrafts: false,
  allowedReferences: ['Articles', 'Pages'],
  ui: { showTarget: true, showRel: false },
})
```

**Specific options:** `allowExternal`, `allowDrafts`, `allowedReferences`, `allowHash`, `allowQuery`, `ui.showTarget`, `ui.showRel`.

### linkedBlocksField

Inlines the `blocks` field of another record into this one. Useful for sharing reusable hero, footer, or CTA blocks across collections.

```ts
import { linkedBlocksField } from '#pruvious/server'

linkedBlocksField({
  collection: 'Templates',
  blocksField: 'blocks',
  ui: { displayFields: 'name', searchFields: 'name' },
})
```

**Specific options:** `collection`, `blocksField`, `ui.displayFields`, `ui.searchFields`, `foreignKey`.

### blocksField

A list of typed content blocks. The block definitions you keep in `app/blocks` provide the available block types and their fields.

```ts
import { blocksField } from '#pruvious/server'

blocksField({
  required: true,
})
```

**Specific options:**

- `allowRootBlocks` - block names, groups, or tags allowed at the root level (defaults to `'*'`).
- `denyRootBlocks` - block names, groups, or tags denied at the root level, applied after `allowRootBlocks`.
- `allowNestedBlocks` - block names, groups, or tags allowed inside nested `blocksField({})` instances (defaults to `'*'`).
- `denyNestedBlocks` - block names, groups, or tags denied inside nested `blocksField({})` instances, applied after `allowNestedBlocks`.
- `allowEmptyArray` - whether an empty array counts as valid when the field is `required`.
- `deduplicateItems` - removes duplicate items from the array.
- `enforceUniqueItems` - validates that all items in the array are unique.
- `minItems` - minimum number of blocks (or `false` to disable).
- `maxItems` - maximum number of blocks (or `false` to disable).

## Structure

### objectField

A non-nullable object with a fixed shape. Each subfield is itself a Pruvious field. Stored as JSON in a `TEXT` column.

```ts
import { objectField, textField, numberField } from '#pruvious/server'

objectField({
  subfields: {
    width: numberField({ default: 0 }),
    unit: textField({ default: 'px' }),
  },
  ui: {
    subfieldsLayout: [{ row: ['width | 6rem', 'unit | 4rem'] }],
  },
})
```

**Specific options:** `subfields`, `ui.subfieldsLayout`, `ui.dataTable.subfield`, `ui.dataTable.label`.

### nullableObjectField

Same as `objectField` but the whole object can be `null`. The dashboard shows a toggle to enable or clear it.

```ts
import { nullableObjectField, textField } from '#pruvious/server'

nullableObjectField({
  default: null,
  subfields: {
    street: textField({}),
    city: textField({}),
  },
})
```

**Specific options:** `subfields`, `ui.subfieldsLayout`.

### repeaterField

An array of objects, each conforming to the same `subfields` shape. The dashboard renders an editable list with add, reorder, and remove actions.

```ts
import { repeaterField, textField, linkField } from '#pruvious/server'

repeaterField({
  subfields: {
    label: textField({ required: true }),
    link: linkField({}),
  },
  ui: {
    addItemLabel: ({ __ }) => __('pruvious-dashboard', 'Add menu item'),
    itemLabelConfiguration: { subfieldValue: 'label' },
    subfieldsLayout: [{ row: ['label', 'link'] }],
  },
})
```

**Specific options:** `subfields`, `ui.addItemLabel`, `ui.itemLabelConfiguration`, `ui.subfieldsLayout`.

### structureField

A repeater with multiple item types. Each item carries a `$key` discriminator and its own set of subfields. Useful for mixed content lists like timelines or media galleries.

```ts
import { structureField, textField, switchField } from '#pruvious/server'

structureField({
  structure: {
    image: {
      src: textField({ required: true }),
      alt: textField({}),
    },
    video: {
      src: textField({ required: true }),
      autoplay: switchField({ default: false }),
    },
  },
})
```

**Specific options:** `structure`, `ui.addItemLabel`, `ui.itemTypeLabels`, `ui.itemLabelConfiguration`.

## Routing and i18n

### subpathField

A nullable text field for URL slugs. Trims whitespace, strips leading/trailing slashes, and validates safe path characters. Used by routable collections.

```ts
import { subpathField } from '#pruvious/server'

subpathField({
  required: true,
  forceLowercase: true,
  allowNesting: true,
  ui: { placeholder: 'my-subpath' },
})
```

**Specific options:** `allowNesting`, `forceLowercase`.

### languageField

Stores a record's language code (e.g. `'en'`, `'de'`). Validates against the configured language list and enforces uniqueness in combination with the related `translationsField`.

```ts
import { languageField } from '#pruvious/server'

languageField({
  required: true,
  default: 'en',
  translationsField: 'translations',
})
```

**Specific options:** `translationsField`.

### translationsField

Stores a unique identifier shared by translations of the same content across languages. Populates to `{ [languageCode]: recordId | null }`. Pairs with `languageField`.

```ts
import { translationsField } from '#pruvious/server'

translationsField({
  immutable: true,
  languageField: 'language',
})
```

**Specific options:** `languageField`.
