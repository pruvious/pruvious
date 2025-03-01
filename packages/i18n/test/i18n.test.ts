import { expect, test } from 'vitest'
import { createPattern, I18n } from '../src'

test('i18n', () => {
  const i18n = new I18n()
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de',
      strings: {
        'Welcome': 'Willkommen',
        'Displayed: $count entries': createPattern(
          'Angezeigt: $count $entries',
          { count: 'number' },
          { entries: [{ conditions: [{ count: 1 }], output: 'Eintrag' }, 'Einträge'] },
        ),
      },
    })
    .defineTranslatableStrings({
      domain: 'errors',
      language: 'en',
      strings: {
        notFound: 'Not found',
      },
    })
    .defineTranslatableStrings({
      domain: 'errors',
      language: 'de',
      strings: {
        notFound: 'Nicht gefunden',
      },
    })
    .defineTranslatableStrings({
      domain: 'ui',
      language: 'de',
      strings: {
        'Show $count items': {
          translation: '$count Artikel anzeigen',
          input: { count: 'number' },
          replacements: {
            count: [{ conditions: [{ count: 1 }], output: 'Einen' }, '$count'],
          },
        },
      },
    })
    .defineTranslatableStrings({
      domain: 'complex',
      language: 'en',
      strings: {
        '$count items': createPattern(
          '$count $items',
          { count: 'number' },
          {
            count: [
              { conditions: [{ count: '0' }], output: 'No' },
              { conditions: [{ count: { '>': '99' } }], output: '99+' },
              '$count',
            ],
            items: [{ conditions: [{ count: 1 }], output: 'item' }, 'items'],
          },
        ),
      },
    })

  expect(i18n.__('default', 'de', 'Welcome')).toBe('Willkommen')
  expect(i18n.__$('default', 'en', 'Welcome')).toBe('Welcome')

  expect(i18n._('de', 'Welcome')).toBe('Willkommen')
  expect(i18n._$('en', 'Welcome')).toBe('Welcome')
  expect(i18n._('de', 'Displayed: $count entries', { count: 1 })).toBe('Angezeigt: 1 Eintrag')
  expect(i18n._('de', 'Displayed: $count entries', { count: 2 })).toBe('Angezeigt: 2 Einträge')

  expect(i18n.__('errors', 'en', 'notFound')).toBe('Not found')
  expect(i18n.__('errors', 'de', 'notFound')).toBe('Nicht gefunden')

  expect(i18n.__('ui', 'de', 'Show $count items', { count: 1 })).toBe('Einen Artikel anzeigen')
  expect(i18n.__('ui', 'de', 'Show $count items', { count: 2 })).toBe('2 Artikel anzeigen')

  expect(i18n.__('complex', 'en', '$count items', { count: 0 })).toBe('No items')
  expect(i18n.__('complex', 'en', '$count items', { count: 1 })).toBe('1 item')
  expect(i18n.__('complex', 'en', '$count items', { count: 99 })).toBe('99 items')
  expect(i18n.__('complex', 'en', '$count items', { count: '99' })).toBe('99 items')
  expect(i18n.__('complex', 'en', '$count items', { count: 500 })).toBe('99+ items')
  expect(i18n.__('complex', 'en', '$count items', { count: '500' })).toBe('99+ items')

  expect(i18n.__$('complex', 'de', '$count items', { count: 0 })).toBe('$count items')
  expect(i18n.setFallbackLanguage('en').__$('complex', 'de', '$count items', { count: 0 })).toBe('No items')

  expect(i18n.__('complex', 'en', 'foo' as any)).toBe('foo')
})
