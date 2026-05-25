import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

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

  test('XSS prevention - disallowed attributes on allowed tags', async () => {
    // event handlers on allowed tags
    expect(await $postAsAdmin(richText, { richText: '<strong onclick="alert(1)">bold</strong>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<em onmouseover="alert(1)">italic</em>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )
    expect(await $postAsAdmin(richText, { richText: '<u onerror="alert(1)">underline</u>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )

    // style attribute on non-span tags
    expect(await $postAsAdmin(richText, { richText: '<strong style="color:red">bold</strong>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )

    // class attribute on non-span tags
    expect(await $postAsAdmin(richText, { richText: '<em class="malicious">italic</em>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )

    // data attributes on allowed tags
    expect(await $postAsAdmin(richText, { richText: '<code data-exploit="true">code</code>' })).toEqual(
      $422([{ richText: expect.any(String) }]),
    )

    // allowed tags without attributes still pass
    expect(await $postAsAdmin(richText, { richText: '<strong>bold</strong>' })).toEqual([
      { richText: '<strong>bold</strong>' },
    ])
    expect(await $postAsAdmin(richText, { richText: '<em>italic</em>' })).toEqual([{ richText: '<em>italic</em>' }])
  })

  test('XSS prevention - span marks with attrs', async () => {
    // correct span attrs pass
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<span class="highlight">text</span>',
      }),
    ).toEqual([{ richTextCustomMarks: '<span class="highlight">text</span>' }])

    // span with extra malicious attributes fails
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<span class="highlight" onclick="alert(1)">text</span>',
      }),
    ).toEqual($422([{ richTextCustomMarks: expect.any(String) }]))
  })

  test('deeply nested marks', async () => {
    // valid deep nesting
    expect(
      await $postAsAdmin(richText, {
        richText: '<strong><em><u>bold italic underline</u></em></strong>',
      }),
    ).toEqual([{ richText: '<strong><em><u>bold italic underline</u></em></strong>' }])

    // valid deep nesting with custom span mark
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<strong><em><span class="highlight">nested highlight</span></em></strong>',
      }),
    ).toEqual([{ richTextCustomMarks: '<strong><em><span class="highlight">nested highlight</span></em></strong>' }])

    // disallowed tag nested inside allowed marks
    expect(
      await $postAsAdmin(richText, {
        richText: '<strong><em><div>nested div</div></em></strong>',
      }),
    ).toEqual($422([{ richText: expect.any(String) }]))

    // malicious attribute on deeply nested allowed tag
    expect(
      await $postAsAdmin(richText, {
        richText: '<strong><em><u onclick="alert(1)">xss</u></em></strong>',
      }),
    ).toEqual($422([{ richText: expect.any(String) }]))

    // script nested inside allowed marks
    expect(
      await $postAsAdmin(richText, {
        richText: '<strong><script>alert(1)</script></strong>',
      }),
    ).toEqual($422([{ richText: expect.any(String) }]))

    // wrong span attrs nested inside valid marks
    expect(
      await $postAsAdmin(richTextCustomMarks, {
        richTextCustomMarks: '<strong><span class="wrong">bad</span></strong>',
      }),
    ).toEqual($422([{ richTextCustomMarks: expect.any(String) }]))
  })

  test('wrong type validators', async () => {
    expect(await $postAsAdmin(richText, { richText: null })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: true })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: [] })).toEqual($422([{ richText: expect.any(String) }]))
    expect(await $postAsAdmin(richText, { richText: {} })).toEqual($422([{ richText: expect.any(String) }]))
  })

  describe('links', () => {
    const richTextLinks = '/api/collections/fields?returning=richTextLinks'
    const richTextNoLinks = '/api/collections/fields?returning=richTextNoLinks'
    const richTextLinksInternalOnly = '/api/collections/fields?returning=richTextLinksInternalOnly'
    const richTextLinksAllowedReferences = '/api/collections/fields?returning=richTextLinksAllowedReferences'
    const richTextLinksNoDrafts = '/api/collections/fields?returning=richTextLinksNoDrafts'
    const richTextLinksNoHash = '/api/collections/fields?returning=richTextLinksNoHash'
    const richTextLinksNoQuery = '/api/collections/fields?returning=richTextLinksNoQuery'

    let routeId: number
    let articleId: number
    let draftRouteId: number

    test('setup: create route and article', async () => {
      const route = (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/rich-blog',
        referencedCollections: ['Articles'],
        isPublicEN: true,
      })) as [{ id: number }]
      routeId = route[0].id

      const article = (await $postAsAdmin('/api/collections/articles?returning=id', {
        name: 'Rich Article',
        price: 1,
        subpath: 'rich-article',
        isPublic: true,
        language: 'en',
      })) as [{ id: number }]
      articleId = article[0].id

      const draft = (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/rich-draft',
        referencedSingleton: 'Options',
        isPublicEN: false,
      })) as [{ id: number }]
      draftRouteId = draft[0].id
    })

    test('accepts external link', async () => {
      const html = '<a href="https://example.com">click</a>'
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual([{ richTextLinks: html }])
    })

    test('accepts external link with target and rel attributes', async () => {
      const html = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">click</a>'
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual([{ richTextLinks: html }])
    })

    test('accepts rel:// link to a route', async () => {
      const html = `<a href="rel://Routes:${routeId}">route</a>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual([{ richTextLinks: html }])
    })

    test('accepts rel:// link to a collection record', async () => {
      const html = `<a href="rel://Routes:${routeId}/Articles:${articleId}">article</a>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual([{ richTextLinks: html }])
    })

    test('accepts link nested inside other marks', async () => {
      const html = `<a href="rel://Routes:${routeId}/Articles:${articleId}"><strong>bold link</strong></a>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual([{ richTextLinks: html }])
    })

    test('rejects link with empty href', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="">x</a>' })).toEqual(
        $422([{ richTextLinks: expect.any(String) }]),
      )
    })

    test('rejects link with disallowed attribute', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="/x" onclick="alert(1)">x</a>' })).toEqual(
        $422([{ richTextLinks: expect.any(String) }]),
      )
    })

    test('rejects malformed rel:// link', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="rel://invalid">x</a>' })).toEqual(
        $422([{ richTextLinks: 'This link is not formatted correctly' }]),
      )
    })

    test('rejects rel:// link to non-existent route', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="rel://Routes:99999">x</a>' })).toEqual(
        $422([{ richTextLinks: 'Record does not exist' }]),
      )
    })

    test('rejects rel:// link to non-existent record', async () => {
      const html = `<a href="rel://Routes:${routeId}/Articles:99999">x</a>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: html })).toEqual(
        $422([{ richTextLinks: 'Record does not exist' }]),
      )
    })

    test('rejects relative/non-protocol href', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="/relative">x</a>' })).toEqual(
        $422([{ richTextLinks: 'Only internal and external links are allowed' }]),
      )
    })

    test('populates internal rel:// link to resolved path', async () => {
      const result = await $postAsAdmin(`${richTextLinks},id&populate=t`, {
        richTextLinks: `<a href="rel://Routes:${routeId}/Articles:${articleId}">article</a>`,
      })
      expect(result).toEqual([
        {
          richTextLinks: '<a href="/rich-blog/rich-article">article</a>',
          id: expect.any(Number),
        },
      ])
    })

    test('preserves query and hash on populated rel:// link', async () => {
      const result = await $postAsAdmin(`${richTextLinks}&populate=t`, {
        richTextLinks: `<a href="rel://Routes:${routeId}/Articles:${articleId}?page=2#section">article</a>`,
      })
      expect(result).toEqual([{ richTextLinks: '<a href="/rich-blog/rich-article?page=2#section">article</a>' }])
    })

    test('passes external URL through unchanged on populate', async () => {
      const html = '<a href="https://example.com/x" target="_blank" rel="noopener">x</a>'
      const result = await $postAsAdmin(`${richTextLinks}&populate=t`, { richTextLinks: html })
      expect(result).toEqual([{ richTextLinks: html }])
    })

    test('populates multiple links in the same value', async () => {
      const html =
        `before <a href="rel://Routes:${routeId}/Articles:${articleId}">article</a>` +
        ` and <a href="https://example.com">ext</a> end`
      const result = await $postAsAdmin(`${richTextLinks}&populate=t`, { richTextLinks: html })
      expect(result).toEqual([
        {
          richTextLinks:
            'before <a href="/rich-blog/rich-article">article</a> and <a href="https://example.com">ext</a> end',
        },
      ])
    })

    test('unwraps broken rel:// links on populate (keeps inner text)', async () => {
      const created = await $postAsAdmin(`${richTextLinks},id`, {
        richTextLinks: `<a href="rel://Routes:${routeId}/Articles:${articleId}">article</a>`,
      })
      const recordId = (created as any)[0].id

      await $deleteAsAdmin(`/api/collections/articles/${articleId}`)

      const populated = await $getAsAdmin(`/api/collections/fields/${recordId}?select=richTextLinks&populate=t`)
      expect(populated).toEqual({ richTextLinks: 'article' })

      const reinstated = (await $postAsAdmin('/api/collections/articles?returning=id', {
        name: 'Rich Article',
        price: 1,
        subpath: 'rich-article',
        isPublic: true,
        language: 'en',
      })) as [{ id: number }]
      articleId = reinstated[0].id
    })

    test('richTextNoLinks: rejects `<a>` tag', async () => {
      expect(await $postAsAdmin(richTextNoLinks, { richTextNoLinks: '<a href="https://example.com">x</a>' })).toEqual(
        $422([{ richTextNoLinks: expect.any(String) }]),
      )
    })

    test('richTextLinksInternalOnly: rejects external href', async () => {
      expect(
        await $postAsAdmin(richTextLinksInternalOnly, {
          richTextLinksInternalOnly: '<a href="https://example.com">x</a>',
        }),
      ).toEqual($422([{ richTextLinksInternalOnly: 'External links are not allowed in this field' }]))
    })

    test('richTextLinksInternalOnly: accepts rel:// href', async () => {
      const html = `<a href="rel://Routes:${routeId}">x</a>`
      expect(await $postAsAdmin(richTextLinksInternalOnly, { richTextLinksInternalOnly: html })).toEqual([
        { richTextLinksInternalOnly: html },
      ])
    })

    test('richTextLinksAllowedReferences: rejects bare route', async () => {
      expect(
        await $postAsAdmin(richTextLinksAllowedReferences, {
          richTextLinksAllowedReferences: `<a href="rel://Routes:${routeId}">x</a>`,
        }),
      ).toEqual($422([{ richTextLinksAllowedReferences: 'Linking to `Routes` is not allowed in this field' }]))
    })

    test('richTextLinksAllowedReferences: accepts Articles link', async () => {
      const html = `<a href="rel://Routes:${routeId}/Articles:${articleId}">x</a>`
      expect(await $postAsAdmin(richTextLinksAllowedReferences, { richTextLinksAllowedReferences: html })).toEqual([
        { richTextLinksAllowedReferences: html },
      ])
    })

    test('richTextLinksNoDrafts: rejects link to a draft route', async () => {
      expect(
        await $postAsAdmin(richTextLinksNoDrafts, {
          richTextLinksNoDrafts: `<a href="rel://Routes:${draftRouteId}">x</a>`,
        }),
      ).toEqual($422([{ richTextLinksNoDrafts: 'Linking to drafts is not allowed in this field' }]))
    })

    test('richTextLinksNoHash: rejects link with hash fragment', async () => {
      expect(
        await $postAsAdmin(richTextLinksNoHash, {
          richTextLinksNoHash: `<a href="rel://Routes:${routeId}#section">x</a>`,
        }),
      ).toEqual($422([{ richTextLinksNoHash: 'Hash fragments are not allowed in this field' }]))
    })

    test('richTextLinksNoQuery: rejects link with query string', async () => {
      expect(
        await $postAsAdmin(richTextLinksNoQuery, {
          richTextLinksNoQuery: `<a href="rel://Routes:${routeId}?foo=bar">x</a>`,
        }),
      ).toEqual($422([{ richTextLinksNoQuery: 'Query strings are not allowed in this field' }]))
    })

    test('rejects unquoted disallowed attribute on `<a>`', async () => {
      expect(
        await $postAsAdmin(richTextLinks, {
          richTextLinks: `<a href="rel://Routes:${routeId}" onclick=alert(1)>x</a>`,
        }),
      ).toEqual($422([{ richTextLinks: expect.any(String) }]))
    })

    test('rejects unquoted disallowed attribute on `<span>` mark', async () => {
      expect(
        await $postAsAdmin(richTextCustomMarks, {
          richTextCustomMarks: '<span class="highlight" onmouseover=alert(1)>x</span>',
        }),
      ).toEqual($422([{ richTextCustomMarks: expect.any(String) }]))
    })

    test('rejects `javascript:` href', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: '<a href="javascript:alert(1)">x</a>' })).toEqual(
        $422([{ richTextLinks: 'Only internal and external links are allowed' }]),
      )
    })

    test('accepts uppercase `<A HREF>` and single-quoted href', async () => {
      const upper = `<A HREF="rel://Routes:${routeId}">x</A>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: upper })).toEqual([{ richTextLinks: upper }])
      const single = `<a href='rel://Routes:${routeId}'>x</a>`
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: single })).toEqual([{ richTextLinks: single }])
    })

    test('rejects nested `<a>` elements', async () => {
      expect(
        await $postAsAdmin(richTextLinks, {
          richTextLinks: `<a href="rel://Routes:${routeId}"><a href="https://example.com">x</a></a>`,
        }),
      ).toEqual($422([{ richTextLinks: 'The `<a>` element is malformed' }]))
    })

    test('rejects self-closing `<a/>` element', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: `<a href="rel://Routes:${routeId}"/>` })).toEqual(
        $422([{ richTextLinks: 'The `<a>` element is malformed' }]),
      )
    })

    test('rejects unclosed `<a>` element', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: `<a href="rel://Routes:${routeId}">x` })).toEqual(
        $422([{ richTextLinks: 'The `<a>` element is malformed' }]),
      )
    })

    test('rejects stray closing `</a>` without opener', async () => {
      expect(await $postAsAdmin(richTextLinks, { richTextLinks: 'x</a>' })).toEqual(
        $422([{ richTextLinks: 'The `<a>` element is malformed' }]),
      )
    })

    test('rejects `<a>` with invalid target value', async () => {
      expect(
        await $postAsAdmin(richTextLinks, {
          richTextLinks: '<a href="https://example.com" target="javascript:alert(1)">x</a>',
        }),
      ).toEqual($422([{ richTextLinks: 'Invalid link target' }]))
    })

    test('rejects `<a>` with rel value containing invalid characters', async () => {
      expect(
        await $postAsAdmin(richTextLinks, {
          richTextLinks: '<a href="https://example.com" rel="noopener\nnoreferrer">x</a>',
        }),
      ).toEqual($422([{ richTextLinks: 'The `rel` value contains invalid characters' }]))
    })

    test('preserves entity-encoded query when populating rel:// href', async () => {
      const result = await $postAsAdmin(`${richTextLinks}&populate=t`, {
        richTextLinks: `<a href="rel://Routes:${routeId}/Articles:${articleId}?a=1&amp;b=2">x</a>`,
      })
      expect(result).toEqual([{ richTextLinks: '<a href="/rich-blog/rich-article?a=1&amp;b=2">x</a>' }])
    })

    test('cleanup: delete routes and article', async () => {
      await $deleteAsAdmin(`/api/collections/articles/${articleId}`)
      await $deleteAsAdmin(`/api/collections/routes/${routeId}`)
      await $deleteAsAdmin(`/api/collections/routes/${draftRouteId}`)
    })
  })
})
