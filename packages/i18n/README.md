# @pruvious/i18n

A flexible internationalization (i18n) library for translating strings in multiple languages. This library supports plain text translations, complex patterns with placeholders, and conditional replacements.

## Installation

```sh
npm install @pruvious/i18n
```

## Usage

### Basic usage

```ts
import { I18n } from '@pruvious/i18n'

const i18n = new I18n()

i18n.defineTranslatableStrings({
  domain: 'default',
  language: 'de',
  strings: {
    'Welcome': 'Willkommen',
    'Hello, $name!': 'Hallo, $name!',
  },
})

i18n._('de', 'Welcome')
// Willkommen

i18n._('de', 'Hello, $name!', { name: 'Alice' })
// Hallo, Alice!
```

### Placeholders and conditions

```ts
i18n.defineTranslatableStrings({
  domain: 'default',
  language: 'de',
  strings: {
    'Displayed: $count entries': createPattern(
      'Angezeigt: $count $entries',
      {
        count: 'number',
      },
      {
        entries: [
          { conditions: [{ count: 1 }], output: 'Eintrag' },
          'Einträge'
        ],
      },
    ),
  },
})

i18n._('de', 'Displayed: $count entries', { count: 1 })
// Angezeigt: 1 Eintrag

i18n._('de', 'Displayed: $count entries', { count: 5 })
// Angezeigt: 5 Einträge
```

### Multiple domains

```ts
i18n.defineTranslatableStrings({
  domain: 'errors',
  language: 'de',
  strings: {
    'Not found': 'Nicht gefunden',
  },
})

i18n.__('errors', 'de', 'Not found')
// Nicht gefunden
```

### Complex conditions

```ts
i18n.defineTranslatableStrings({
  domain: 'default',
  language: 'en',
  strings: {
    '$count items': createPattern(
      '$count $items',
      {
        count: 'number',
      },
      {
        count: [
          { conditions: [{ count: 0 }], output: 'No' },
          { conditions: [{ count: { '>': 99 } }], output: '99+' },
          '$count',
        ],
        items: [{ conditions: [{ count: 1 }], output: 'item' }, 'items'],
      },
    ),
  },
})

i18n._('en', '$count items', { count: 0 })
// No items

i18n._('en', '$count items', { count: 1 })
// 1 item

i18n._('en', '$count items', { count: 99 })
// 99 items

i18n._('en', '$count items', { count: 500 })
// 99+ items
```

## License

This repository is licensed under the [MIT License](./LICENSE).
