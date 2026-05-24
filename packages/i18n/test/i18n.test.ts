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

test('regional code inherits from base via getDefinition synthesis', () => {
  const i18n = new I18n()
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de',
      strings: { Welcome: 'Willkommen', Bye: 'Tschüss' },
    })
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de-AT',
      strings: { Welcome: 'Servus' },
    })

  // Regional overrides base for shared handles.
  expect(i18n.__$('default', 'de-AT', 'Welcome')).toBe('Servus')
  // Missing regional handle falls back to base.
  expect(i18n.__$('default', 'de-AT', 'Bye')).toBe('Tschüss')
  // Base is untouched.
  expect(i18n.__$('default', 'de', 'Welcome')).toBe('Willkommen')
})

test('regional code with no own file inherits everything from base', () => {
  const i18n = new I18n().defineTranslatableStrings({
    domain: 'default',
    language: 'de',
    strings: { Welcome: 'Willkommen' },
  })

  expect(i18n.hasDefinition('default', 'de-AT')).toBe(true)
  expect(i18n.__$('default', 'de-AT', 'Welcome')).toBe('Willkommen')
})

test('regional code with neither own nor base returns the handle', () => {
  const i18n = new I18n()
  expect(i18n.hasDefinition('default', 'fr-CA')).toBe(false)
  expect(i18n.__$('default', 'fr-CA', 'Welcome')).toBe('Welcome')
})

test('defining base after regional invalidates cached regional lookup', () => {
  const i18n = new I18n().defineTranslatableStrings({
    domain: 'default',
    language: 'de-AT',
    strings: { Welcome: 'Servus' },
  })

  // Warm regional cache with a handle only the base would supply.
  expect(i18n.__$('default', 'de-AT', 'Bye')).toBe('Bye')

  i18n.defineTranslatableStrings({
    domain: 'default',
    language: 'de',
    strings: { Bye: 'Tschüss' },
  })

  // Cache was invalidated, so the second lookup now sees the base.
  expect(i18n.__$('default', 'de-AT', 'Bye')).toBe('Tschüss')
})

test('definition order does not affect merge result', () => {
  const a = new I18n()
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de',
      strings: { Welcome: 'Willkommen', Bye: 'Tschüss' },
    })
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de-AT',
      strings: { Welcome: 'Servus' },
    })

  const b = new I18n()
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de-AT',
      strings: { Welcome: 'Servus' },
    })
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de',
      strings: { Welcome: 'Willkommen', Bye: 'Tschüss' },
    })

  for (const i18n of [a, b]) {
    expect(i18n.__$('default', 'de-AT', 'Welcome')).toBe('Servus')
    expect(i18n.__$('default', 'de-AT', 'Bye')).toBe('Tschüss')
  }
})

test('pattern vs string shape collision warns once', () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    warnings.push(args.join(' '))
  }

  try {
    const i18n = new I18n()
      .defineTranslatableStrings({
        domain: 'default',
        language: 'de',
        strings: {
          Count: createPattern('$count Stück', { count: 'number' }),
        },
      })
      .defineTranslatableStrings({
        domain: 'default',
        language: 'de-AT',
        strings: { Count: 'Stück' },
      })

    // Multiple lookups; warning should fire only once.
    i18n.__$('default', 'de-AT', 'Count', { count: 1 })
    i18n.__$('default', 'de-AT', 'Count', { count: 2 })
    i18n.__$('default', 'de-AT', 'Count', { count: 3 })

    const collisionWarnings = warnings.filter((w) => w.includes('shape mismatch'))
    expect(collisionWarnings.length).toBe(1)
  } finally {
    console.warn = original
  }
})

test('fallbackLanguages can contain a regional code that itself inherits from base', () => {
  const i18n = new I18n()
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de',
      strings: { Welcome: 'Willkommen', Bye: 'Tschüss' },
    })
    .defineTranslatableStrings({
      domain: 'default',
      language: 'de-AT',
      strings: { Welcome: 'Servus' },
    })
    .setFallbackLanguages(['de-AT', 'de'])

  // `fr` has no own definition; first fallback `de-AT` synthesises (Servus + Tschüss from base).
  expect(i18n.__$('default', 'fr', 'Welcome')).toBe('Servus')
  expect(i18n.__$('default', 'fr', 'Bye')).toBe('Tschüss')
})
