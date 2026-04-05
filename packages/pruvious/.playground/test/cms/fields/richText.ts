import { describe, expect, test } from 'vitest'
import { $422, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('richText field', () => {
  const richText = '/api/collections/fields?returning=richText'
  const richTextNoMarks = '/api/collections/fields?returning=richTextNoMarks'
  const richTextNoLineBreaks = '/api/collections/fields?returning=richTextNoLineBreaks'
  const richTextCustomMarks = '/api/collections/fields?returning=richTextCustomMarks'
  const richTextToolbarGroups = '/api/collections/fields?returning=richTextToolbarGroups'
  const richTextToolbarFalse = '/api/collections/fields?returning=richTextToolbarFalse'
  const richTextNoNormalize = '/api/collections/fields?returning=richTextNoNormalize'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(richText, { richText: undefined })).toEqual([{ richText: '' }])
    expect(await $postAsAdmin(richText, { richText: 'Hello world' })).toEqual([{ richText: 'Hello world' }])
    expect(await $postAsAdmin(richText, { richText: '<strong>bold</strong>' })).toEqual([
      { richText: '<strong>bold</strong>' },
    ])
    expect(await $getAsAdmin(`/api/collections/fields?select=richText&where=richText[=][Hello world]`)).toEqual(
      $paginated([{ richText: 'Hello world' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=richText&where=richText[=][Hello world]`, {
        richText: 'Updated',
      }),
    ).toEqual([{ richText: 'Updated' }])
  })

  test('sanitizers', async () => {
    // type coercion
    expect(await $postAsAdmin(richText, { richText: 123 })).toEqual([{ richText: '123' }])
  })

  test('allowed marks', async () => {
    // all common marks should pass
    expect(await $postAsAdmin(richText, { richText: '<strong>bold</strong>' })).toEqual([
      { richText: '<strong>bold</strong>' },
    ])
    expect(await $postAsAdmin(richText, { richText: '<em>italic</em>' })).toEqual([{ richText: '<em>italic</em>' }])
    expect(await $postAsAdmin(richText, { richText: '<u>underline</u>' })).toEqual([{ richText: '<u>underline</u>' }])
    expect(await $postAsAdmin(richText, { richText: '<code>code</code>' })).toEqual([{ richText: '<code>code</code>' }])
    expect(await $postAsAdmin(richText, { richText: '<s>strikethrough</s>' })).toEqual([
      { richText: '<s>strikethrough</s>' },
    ])
    expect(await $postAsAdmin(richText, { richText: '<sub>sub</sub>' })).toEqual([{ richText: '<sub>sub</sub>' }])
    expect(await $postAsAdmin(richText, { richText: '<sup>sup</sup>' })).toEqual([{ richText: '<sup>sup</sup>' }])

    // parseTags should also pass
    expect(await $postAsAdmin(richText, { richText: '<b>bold via b</b>' })).toEqual([{ richText: '<b>bold via b</b>' }])
    expect(await $postAsAdmin(richText, { richText: '<i>italic via i</i>' })).toEqual([
      { richText: '<i>italic via i</i>' },
    ])
    expect(await $postAsAdmin(richText, { richText: '<del>strikethrough via del</del>' })).toEqual([
      { richText: '<del>strikethrough via del</del>' },
    ])
    expect(await $postAsAdmin(richText, { richText: '<strike>strikethrough via strike</strike>' })).toEqual([
      { richText: '<strike>strikethrough via strike</strike>' },
    ])

    // line breaks allowed by default
    expect(await $postAsAdmin(richText, { richText: 'Hello<br>world' })).toEqual([{ richText: 'Hello<br>world' }])

    // mixed marks
    expect(await $postAsAdmin(richText, { richText: '<strong><em>bold italic</em></strong>' })).toEqual([
      { richText: '<strong><em>bold italic</em></strong>' },
    ])

    // plain text (no marks) should always pass
    expect(await $postAsAdmin(richText, { richText: 'plain text' })).toEqual([{ richText: 'plain text' }])
  })

  test('disallowed HTML', async () => {
    // disallowed tags should fail validation
    expect(await $postAsAdmin(richText, { richText: '<div>div</div>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<script>alert(1)</script>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<p>paragraph</p>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<a href="#">link</a>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<h1>heading</h1>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<img src="x">' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
  })

  test('no marks field', async () => {
    // plain text passes
    expect(await $postAsAdmin(richTextNoMarks, { richTextNoMarks: 'plain text' })).toEqual([
      { richTextNoMarks: 'plain text' },
    ])

    // any HTML tag should fail (no marks configured)
    expect(await $postAsAdmin(richTextNoMarks, { richTextNoMarks: '<strong>bold</strong>' })).toEqual(
      $422([{ richTextNoMarks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richTextNoMarks, { richTextNoMarks: '<em>italic</em>' })).toEqual(
      $422([{ richTextNoMarks: expect.any(String) }]),
    )

    // br is allowed by default (allowLineBreaks defaults to true)
    expect(await $postAsAdmin(richTextNoMarks, { richTextNoMarks: 'Hello<br>world' })).toEqual([
      { richTextNoMarks: 'Hello<br>world' },
    ])
  })

  test('no line breaks', async () => {
    // marks pass
    expect(await $postAsAdmin(richTextNoLineBreaks, { richTextNoLineBreaks: '<strong>bold</strong>' })).toEqual([
      { richTextNoLineBreaks: '<strong>bold</strong>' },
    ])

    // br should fail
    expect(await $postAsAdmin(richTextNoLineBreaks, { richTextNoLineBreaks: 'Hello<br>world' })).toEqual(
      $422([{ richTextNoLineBreaks: expect.any(String) }]),
    )

    expect(await $postAsAdmin(richTextNoLineBreaks, { richTextNoLineBreaks: 'Hello<br/>world' })).toEqual(
      $422([{ richTextNoLineBreaks: expect.any(String) }]),
    )
  })

  test('custom marks with attrs', async () => {
    // allowed marks pass
    expect(await $postAsAdmin(richTextCustomMarks, { richTextCustomMarks: '<strong>bold</strong>' })).toEqual([
      { richTextCustomMarks: '<strong>bold</strong>' },
    ])

    expect(await $postAsAdmin(richTextCustomMarks, { richTextCustomMarks: '<em>italic</em>' })).toEqual([
      { richTextCustomMarks: '<em>italic</em>' },
    ])

    // custom span mark with matching class passes
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<span class="highlight">highlighted</span>',
      }),
    ).toEqual([{ richTextCustomMarks: '<span class="highlight">highlighted</span>' }])

    // span with wrong class fails
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<span class="wrong">wrong</span>',
      }),
    ).toEqual($422([{ richTextCustomMarks: expect.any(String) }]))

    // bare span without class fails
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<span>bare span</span>',
      }),
    ).toEqual($422([{ richTextCustomMarks: expect.any(String) }]))

    // marks not in config fail (e.g., code, underline)
    expect(await $postAsAdmin(richTextCustomMarks, { richTextCustomMarks: '<code>code</code>' })).toEqual(
      $422([{ richTextCustomMarks: expect.any(String) }]),
    )

    expect(await $postAsAdmin(richTextCustomMarks, { richTextCustomMarks: '<u>underline</u>' })).toEqual(
      $422([{ richTextCustomMarks: expect.any(String) }]),
    )
  })

  test('normalizeWhitespace (default: enabled)', async () => {
    // consecutive whitespace collapsed
    expect(await $postAsAdmin(richText, { richText: ' <strong> Hello, </strong>World! ' })).toEqual([
      { richText: '<strong>Hello,</strong> World!' },
    ])

    // leading/trailing whitespace trimmed
    expect(await $postAsAdmin(richText, { richText: '  hello  ' })).toEqual([{ richText: 'hello' }])

    // whitespace around marks normalized
    expect(await $postAsAdmin(richText, { richText: ' <strong> Hello </strong>, World! ' })).toEqual([
      { richText: '<strong>Hello</strong> , World!' },
    ])
  })

  test('normalizeWhitespace disabled', async () => {
    // whitespace preserved as-is
    expect(await $postAsAdmin(richTextNoNormalize, { richTextNoNormalize: '  hello  ' })).toEqual([
      { richTextNoNormalize: '  hello  ' },
    ])

    expect(await $postAsAdmin(richTextNoNormalize, { richTextNoNormalize: ' <strong> Hello </strong> ' })).toEqual([
      { richTextNoNormalize: ' <strong> Hello </strong> ' },
    ])
  })

  test('wrong type validators', async () => {
    expect(await $postAsAdmin(richText, { richText: null })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: true })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: [] })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: {} })).toEqual($422([{ richText: expect.any(String) }]))
  })
})
