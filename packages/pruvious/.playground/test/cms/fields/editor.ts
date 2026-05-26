import { describe, expect, test } from 'vitest'
import { $422, $deleteAsAdmin, $getAsAdmin, $paginated, $patchAsAdmin, $postAsAdmin } from '../utils'

describe('editor field', () => {
  const editor = '/api/collections/fields?returning=editor'
  const editorLimitedBlocks = '/api/collections/fields?returning=editorLimitedBlocks'
  const editorNoLinks = '/api/collections/fields?returning=editorNoLinks'
  const editorNoMarks = '/api/collections/fields?returning=editorNoMarks'
  const editorMinimal = '/api/collections/fields?returning=editorMinimal'
  const editorCustomMarks = '/api/collections/fields?returning=editorCustomMarks'
  const editorNoNormalize = '/api/collections/fields?returning=editorNoNormalize'

  test('create, filter, update', async () => {
    expect(await $postAsAdmin(editor, { editor: undefined })).toEqual([{ editor: '' }])
    expect(await $postAsAdmin(editor, { editor: '<p>Hello world</p>' })).toEqual([{ editor: '<p>Hello world</p>' }])
    expect(await $postAsAdmin(editor, { editor: '<p><strong>bold</strong></p>' })).toEqual([
      { editor: '<p><strong>bold</strong></p>' },
    ])
    expect(await $getAsAdmin(`/api/collections/fields?select=editor&where=editor[=][<p>Hello world</p>]`)).toEqual(
      $paginated([{ editor: '<p>Hello world</p>' }]),
    )
    expect(
      await $patchAsAdmin(`/api/collections/fields?returning=editor&where=editor[=][<p>Hello world</p>]`, {
        editor: '<p>Updated</p>',
      }),
    ).toEqual([{ editor: '<p>Updated</p>' }])
  })

  test('sanitizers', async () => {
    // type coercion
    expect(await $postAsAdmin(editor, { editor: 123 })).toEqual([{ editor: '123' }])
  })

  test('allowed block tags', async () => {
    expect(await $postAsAdmin(editor, { editor: '<p>paragraph</p>' })).toEqual([{ editor: '<p>paragraph</p>' }])
    expect(await $postAsAdmin(editor, { editor: '<h1>h1</h1>' })).toEqual([{ editor: '<h1>h1</h1>' }])
    expect(await $postAsAdmin(editor, { editor: '<h2>h2</h2>' })).toEqual([{ editor: '<h2>h2</h2>' }])
    expect(await $postAsAdmin(editor, { editor: '<h3>h3</h3>' })).toEqual([{ editor: '<h3>h3</h3>' }])
    expect(await $postAsAdmin(editor, { editor: '<h4>h4</h4>' })).toEqual([{ editor: '<h4>h4</h4>' }])
    expect(await $postAsAdmin(editor, { editor: '<h5>h5</h5>' })).toEqual([{ editor: '<h5>h5</h5>' }])
    expect(await $postAsAdmin(editor, { editor: '<h6>h6</h6>' })).toEqual([{ editor: '<h6>h6</h6>' }])
    expect(await $postAsAdmin(editor, { editor: '<ul><li>item</li></ul>' })).toEqual([
      { editor: '<ul><li>item</li></ul>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<ol><li>item</li></ol>' })).toEqual([
      { editor: '<ol><li>item</li></ol>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<blockquote>quote</blockquote>' })).toEqual([
      { editor: '<blockquote>quote</blockquote>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<pre><code>code</code></pre>' })).toEqual([
      { editor: '<pre><code>code</code></pre>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<hr>' })).toEqual([{ editor: '<hr>' }])
  })

  test('allowed marks inside blocks', async () => {
    expect(await $postAsAdmin(editor, { editor: '<p><strong>bold</strong></p>' })).toEqual([
      { editor: '<p><strong>bold</strong></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><em>italic</em></p>' })).toEqual([
      { editor: '<p><em>italic</em></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><u>underline</u></p>' })).toEqual([
      { editor: '<p><u>underline</u></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><code>code</code></p>' })).toEqual([
      { editor: '<p><code>code</code></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><s>strike</s></p>' })).toEqual([{ editor: '<p><s>strike</s></p>' }])
    expect(await $postAsAdmin(editor, { editor: '<p><sub>sub</sub></p>' })).toEqual([
      { editor: '<p><sub>sub</sub></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><sup>sup</sup></p>' })).toEqual([
      { editor: '<p><sup>sup</sup></p>' },
    ])

    // parseTags should also pass
    expect(await $postAsAdmin(editor, { editor: '<p><b>bold via b</b></p>' })).toEqual([
      { editor: '<p><b>bold via b</b></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><i>italic via i</i></p>' })).toEqual([
      { editor: '<p><i>italic via i</i></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><del>del</del></p>' })).toEqual([
      { editor: '<p><del>del</del></p>' },
    ])
    expect(await $postAsAdmin(editor, { editor: '<p><strike>strike</strike></p>' })).toEqual([
      { editor: '<p><strike>strike</strike></p>' },
    ])

    // mixed marks
    expect(await $postAsAdmin(editor, { editor: '<p><strong><em>bold italic</em></strong></p>' })).toEqual([
      { editor: '<p><strong><em>bold italic</em></strong></p>' },
    ])
  })

  test('disallowed HTML', async () => {
    expect(await $postAsAdmin(editor, { editor: '<div>div</div>' })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: '<script>alert(1)</script>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<img src="x">' })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: '<iframe src="x"></iframe>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<section>section</section>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
  })

  test('block tags cannot have attributes', async () => {
    expect(await $postAsAdmin(editor, { editor: '<p class="foo">x</p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<h1 id="x">x</h1>' })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: '<ul class="list"><li>x</li></ul>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<li class="item">x</li>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<blockquote cite="x">x</blockquote>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<pre class="lang"><code>x</code></pre>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<hr class="divider">' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
  })

  test('limited blocks', async () => {
    // allowed blocks pass
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<p>x</p>' })).toEqual([
      { editorLimitedBlocks: '<p>x</p>' },
    ])
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<h2>x</h2>' })).toEqual([
      { editorLimitedBlocks: '<h2>x</h2>' },
    ])
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<h3>x</h3>' })).toEqual([
      { editorLimitedBlocks: '<h3>x</h3>' },
    ])
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<ul><li>x</li></ul>' })).toEqual([
      { editorLimitedBlocks: '<ul><li>x</li></ul>' },
    ])
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<blockquote>x</blockquote>' })).toEqual([
      { editorLimitedBlocks: '<blockquote>x</blockquote>' },
    ])

    // disallowed blocks fail
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<h1>x</h1>' })).toEqual(
      $422([{ editorLimitedBlocks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<h4>x</h4>' })).toEqual(
      $422([{ editorLimitedBlocks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<ol><li>x</li></ol>' })).toEqual(
      $422([{ editorLimitedBlocks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<pre><code>x</code></pre>' })).toEqual(
      $422([{ editorLimitedBlocks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorLimitedBlocks, { editorLimitedBlocks: '<hr>' })).toEqual(
      $422([{ editorLimitedBlocks: expect.any(String) }]),
    )
  })

  test('minimal (paragraph only)', async () => {
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<p>plain</p>' })).toEqual([
      { editorMinimal: '<p>plain</p>' },
    ])

    // all other blocks rejected
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<h1>x</h1>' })).toEqual(
      $422([{ editorMinimal: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<ul><li>x</li></ul>' })).toEqual(
      $422([{ editorMinimal: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<blockquote>x</blockquote>' })).toEqual(
      $422([{ editorMinimal: expect.any(String) }]),
    )

    // marks rejected (no marks configured)
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<p><strong>x</strong></p>' })).toEqual(
      $422([{ editorMinimal: expect.any(String) }]),
    )

    // links rejected
    expect(await $postAsAdmin(editorMinimal, { editorMinimal: '<p><a href="https://example.com">x</a></p>' })).toEqual(
      $422([{ editorMinimal: expect.any(String) }]),
    )
  })

  test('no marks field', async () => {
    // blocks pass
    expect(await $postAsAdmin(editorNoMarks, { editorNoMarks: '<p>plain text</p>' })).toEqual([
      { editorNoMarks: '<p>plain text</p>' },
    ])

    // marks rejected
    expect(await $postAsAdmin(editorNoMarks, { editorNoMarks: '<p><strong>bold</strong></p>' })).toEqual(
      $422([{ editorNoMarks: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editorNoMarks, { editorNoMarks: '<p><em>italic</em></p>' })).toEqual(
      $422([{ editorNoMarks: expect.any(String) }]),
    )
  })

  test('custom marks with attrs', async () => {
    // configured marks pass
    expect(await $postAsAdmin(editorCustomMarks, { editorCustomMarks: '<p><strong>bold</strong></p>' })).toEqual([
      { editorCustomMarks: '<p><strong>bold</strong></p>' },
    ])
    expect(await $postAsAdmin(editorCustomMarks, { editorCustomMarks: '<p><em>italic</em></p>' })).toEqual([
      { editorCustomMarks: '<p><em>italic</em></p>' },
    ])

    // custom span mark with matching class passes
    expect(
      await $postAsAdmin(editorCustomMarks, {
        editorCustomMarks: '<p><span class="highlight">highlighted</span></p>',
      }),
    ).toEqual([{ editorCustomMarks: '<p><span class="highlight">highlighted</span></p>' }])

    // span with wrong class fails
    expect(
      await $postAsAdmin(editorCustomMarks, {
        editorCustomMarks: '<p><span class="wrong">wrong</span></p>',
      }),
    ).toEqual($422([{ editorCustomMarks: expect.any(String) }]))

    // bare span without class fails
    expect(
      await $postAsAdmin(editorCustomMarks, {
        editorCustomMarks: '<p><span>bare</span></p>',
      }),
    ).toEqual($422([{ editorCustomMarks: expect.any(String) }]))

    // marks not in config fail
    expect(await $postAsAdmin(editorCustomMarks, { editorCustomMarks: '<p><u>underline</u></p>' })).toEqual(
      $422([{ editorCustomMarks: expect.any(String) }]),
    )
  })

  test('normalizeWhitespace (default: enabled)', async () => {
    // consecutive whitespace collapsed
    expect(await $postAsAdmin(editor, { editor: '<p> <strong> Hello, </strong>World! </p>' })).toEqual([
      { editor: '<p><strong>Hello,</strong> World!</p>' },
    ])

    // leading/trailing whitespace trimmed
    expect(await $postAsAdmin(editor, { editor: '  <p>hello</p>  ' })).toEqual([{ editor: '<p>hello</p>' }])
  })

  test('normalizeWhitespace disabled', async () => {
    expect(await $postAsAdmin(editorNoNormalize, { editorNoNormalize: '<p>  hello  </p>' })).toEqual([
      { editorNoNormalize: '<p>  hello  </p>' },
    ])
    expect(await $postAsAdmin(editorNoNormalize, { editorNoNormalize: ' <p> <strong> Hi </strong> </p> ' })).toEqual([
      { editorNoNormalize: ' <p> <strong> Hi </strong> </p> ' },
    ])
  })

  test('XSS prevention - disallowed attributes on allowed tags', async () => {
    // event handlers on mark tags
    expect(await $postAsAdmin(editor, { editor: '<p><strong onclick="alert(1)">x</strong></p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<p><em onmouseover="alert(1)">x</em></p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )

    // event handlers on block tags
    expect(await $postAsAdmin(editor, { editor: '<p onclick="alert(1)">x</p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
    expect(await $postAsAdmin(editor, { editor: '<h1 onload="alert(1)">x</h1>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )

    // style attribute on non-span tags
    expect(await $postAsAdmin(editor, { editor: '<p><strong style="color:red">x</strong></p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )

    // data attributes on allowed tags
    expect(await $postAsAdmin(editor, { editor: '<p><code data-exploit="true">x</code></p>' })).toEqual(
      $422([{ editor: expect.any(String) }]),
    )
  })

  test('XSS prevention - span marks with attrs', async () => {
    // correct span attrs pass
    expect(
      await $postAsAdmin(editorCustomMarks, {
        editorCustomMarks: '<p><span class="highlight">x</span></p>',
      }),
    ).toEqual([{ editorCustomMarks: '<p><span class="highlight">x</span></p>' }])

    // span with extra malicious attributes fails
    expect(
      await $postAsAdmin(editorCustomMarks, {
        editorCustomMarks: '<p><span class="highlight" onclick="alert(1)">x</span></p>',
      }),
    ).toEqual($422([{ editorCustomMarks: expect.any(String) }]))
  })

  test('deeply nested marks inside blocks', async () => {
    // valid deep nesting
    expect(
      await $postAsAdmin(editor, {
        editor: '<p><strong><em><u>bold italic underline</u></em></strong></p>',
      }),
    ).toEqual([{ editor: '<p><strong><em><u>bold italic underline</u></em></strong></p>' }])

    // valid deep nesting inside list
    expect(
      await $postAsAdmin(editor, {
        editor: '<ul><li><strong>bold</strong> in <em>list</em></li></ul>',
      }),
    ).toEqual([{ editor: '<ul><li><strong>bold</strong> in <em>list</em></li></ul>' }])

    // disallowed tag nested inside allowed marks
    expect(
      await $postAsAdmin(editor, {
        editor: '<p><strong><em><div>x</div></em></strong></p>',
      }),
    ).toEqual($422([{ editor: expect.any(String) }]))

    // script nested inside allowed marks
    expect(
      await $postAsAdmin(editor, {
        editor: '<p><strong><script>alert(1)</script></strong></p>',
      }),
    ).toEqual($422([{ editor: expect.any(String) }]))
  })

  test('multiple blocks in one document', async () => {
    const html =
      '<h1>Title</h1>' +
      '<p>Intro <strong>paragraph</strong>.</p>' +
      '<ul><li>one</li><li>two</li></ul>' +
      '<blockquote>quote</blockquote>' +
      '<pre><code>code</code></pre>' +
      '<hr>'
    expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
  })

  test('wrong type validators', async () => {
    expect(await $postAsAdmin(editor, { editor: null })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: true })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: [] })).toEqual($422([{ editor: expect.any(String) }]))
    expect(await $postAsAdmin(editor, { editor: {} })).toEqual($422([{ editor: expect.any(String) }]))
  })

  describe('links', () => {
    const editorLinksInternalOnly = '/api/collections/fields?returning=editorLinksInternalOnly'
    const editorLinksAllowedReferences = '/api/collections/fields?returning=editorLinksAllowedReferences'
    const editorLinksNoDrafts = '/api/collections/fields?returning=editorLinksNoDrafts'

    let routeId: number
    let articleId: number
    let draftRouteId: number

    test('setup: create route and article', async () => {
      const route = (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/editor-blog',
        referencedCollections: ['Articles'],
        isPublicEN: true,
      })) as [{ id: number }]
      routeId = route[0].id

      const article = (await $postAsAdmin('/api/collections/articles?returning=id', {
        name: 'Editor Article',
        price: 1,
        subpath: 'editor-article',
        isPublic: true,
        language: 'en',
      })) as [{ id: number }]
      articleId = article[0].id

      const draft = (await $postAsAdmin('/api/collections/routes?returning=id', {
        pathEN: '/editor-draft',
        referencedSingleton: 'Options',
        isPublicEN: false,
      })) as [{ id: number }]
      draftRouteId = draft[0].id
    })

    test('accepts external link', async () => {
      const html = '<p><a href="https://example.com">click</a></p>'
      expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
    })

    test('accepts external link with target and rel attributes', async () => {
      const html = '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">click</a></p>'
      expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
    })

    test('accepts rel:// link to a route', async () => {
      const html = `<p><a href="rel://Routes:${routeId}">route</a></p>`
      expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
    })

    test('accepts rel:// link to a collection record', async () => {
      const html = `<p><a href="rel://Routes:${routeId}/Articles:${articleId}">article</a></p>`
      expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
    })

    test('accepts link nested inside other marks', async () => {
      const html = `<p><a href="rel://Routes:${routeId}/Articles:${articleId}"><strong>bold link</strong></a></p>`
      expect(await $postAsAdmin(editor, { editor: html })).toEqual([{ editor: html }])
    })

    test('rejects link with empty href', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="">x</a></p>' })).toEqual(
        $422([{ editor: expect.any(String) }]),
      )
    })

    test('rejects link with disallowed attribute', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="/x" onclick="alert(1)">x</a></p>' })).toEqual(
        $422([{ editor: expect.any(String) }]),
      )
    })

    test('rejects malformed rel:// link', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="rel://invalid">x</a></p>' })).toEqual(
        $422([{ editor: 'This link is not formatted correctly' }]),
      )
    })

    test('rejects rel:// link to non-existent route', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="rel://Routes:99999">x</a></p>' })).toEqual(
        $422([{ editor: 'Record does not exist' }]),
      )
    })

    test('rejects relative/non-protocol href', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="/relative">x</a></p>' })).toEqual(
        $422([{ editor: 'Only internal and external links are allowed' }]),
      )
    })

    test('rejects javascript: href', async () => {
      expect(await $postAsAdmin(editor, { editor: '<p><a href="javascript:alert(1)">x</a></p>' })).toEqual(
        $422([{ editor: 'Only internal and external links are allowed' }]),
      )
    })

    test('populates internal rel:// link to resolved path', async () => {
      const result = await $postAsAdmin(`${editor},id&populate=t`, {
        editor: `<p><a href="rel://Routes:${routeId}/Articles:${articleId}">article</a></p>`,
      })
      expect(result).toEqual([
        {
          editor: '<p><a href="/editor-blog/editor-article">article</a></p>',
          id: expect.any(Number),
        },
      ])
    })

    test('preserves query and hash on populated rel:// link', async () => {
      const result = await $postAsAdmin(`${editor}&populate=t`, {
        editor: `<p><a href="rel://Routes:${routeId}/Articles:${articleId}?page=2#section">article</a></p>`,
      })
      expect(result).toEqual([{ editor: '<p><a href="/editor-blog/editor-article?page=2#section">article</a></p>' }])
    })

    test('populates multiple links in the same value', async () => {
      const html =
        `<p>before <a href="rel://Routes:${routeId}/Articles:${articleId}">article</a>` +
        ` and <a href="https://example.com">ext</a> end</p>`
      const result = await $postAsAdmin(`${editor}&populate=t`, { editor: html })
      expect(result).toEqual([
        {
          editor:
            '<p>before <a href="/editor-blog/editor-article">article</a> and <a href="https://example.com">ext</a> end</p>',
        },
      ])
    })

    test('unwraps broken rel:// links on populate (keeps inner text)', async () => {
      const created = await $postAsAdmin(`${editor},id`, {
        editor: `<p><a href="rel://Routes:${routeId}/Articles:${articleId}">article</a></p>`,
      })
      const recordId = (created as any)[0].id

      await $deleteAsAdmin(`/api/collections/articles/${articleId}`)

      const populated = await $getAsAdmin(`/api/collections/fields/${recordId}?select=editor&populate=t`)
      expect(populated).toEqual({ editor: '<p>article</p>' })

      const reinstated = (await $postAsAdmin('/api/collections/articles?returning=id', {
        name: 'Editor Article',
        price: 1,
        subpath: 'editor-article',
        isPublic: true,
        language: 'en',
      })) as [{ id: number }]
      articleId = reinstated[0].id
    })

    test('editorNoLinks: rejects `<a>` tag', async () => {
      expect(
        await $postAsAdmin(editorNoLinks, { editorNoLinks: '<p><a href="https://example.com">x</a></p>' }),
      ).toEqual($422([{ editorNoLinks: expect.any(String) }]))
    })

    test('editorLinksInternalOnly: rejects external href', async () => {
      expect(
        await $postAsAdmin(editorLinksInternalOnly, {
          editorLinksInternalOnly: '<p><a href="https://example.com">x</a></p>',
        }),
      ).toEqual($422([{ editorLinksInternalOnly: 'External links are not allowed in this field' }]))
    })

    test('editorLinksInternalOnly: accepts rel:// href', async () => {
      const html = `<p><a href="rel://Routes:${routeId}">x</a></p>`
      expect(await $postAsAdmin(editorLinksInternalOnly, { editorLinksInternalOnly: html })).toEqual([
        { editorLinksInternalOnly: html },
      ])
    })

    test('editorLinksAllowedReferences: rejects bare route', async () => {
      expect(
        await $postAsAdmin(editorLinksAllowedReferences, {
          editorLinksAllowedReferences: `<p><a href="rel://Routes:${routeId}">x</a></p>`,
        }),
      ).toEqual($422([{ editorLinksAllowedReferences: 'Linking to `Routes` is not allowed in this field' }]))
    })

    test('editorLinksAllowedReferences: accepts Articles link', async () => {
      const html = `<p><a href="rel://Routes:${routeId}/Articles:${articleId}">x</a></p>`
      expect(await $postAsAdmin(editorLinksAllowedReferences, { editorLinksAllowedReferences: html })).toEqual([
        { editorLinksAllowedReferences: html },
      ])
    })

    test('editorLinksNoDrafts: rejects link to a draft route', async () => {
      expect(
        await $postAsAdmin(editorLinksNoDrafts, {
          editorLinksNoDrafts: `<p><a href="rel://Routes:${draftRouteId}">x</a></p>`,
        }),
      ).toEqual($422([{ editorLinksNoDrafts: 'Linking to drafts is not allowed in this field' }]))
    })

    test('rejects nested `<a>` elements', async () => {
      expect(
        await $postAsAdmin(editor, {
          editor: `<p><a href="rel://Routes:${routeId}"><a href="https://example.com">x</a></a></p>`,
        }),
      ).toEqual($422([{ editor: 'The `<a>` element is malformed' }]))
    })

    test('rejects self-closing `<a/>` element', async () => {
      expect(await $postAsAdmin(editor, { editor: `<p><a href="rel://Routes:${routeId}"/></p>` })).toEqual(
        $422([{ editor: 'The `<a>` element is malformed' }]),
      )
    })

    test('rejects unclosed `<a>` element', async () => {
      expect(await $postAsAdmin(editor, { editor: `<p><a href="rel://Routes:${routeId}">x</p>` })).toEqual(
        $422([{ editor: 'The `<a>` element is malformed' }]),
      )
    })

    test('rejects `<a>` with invalid target value', async () => {
      expect(
        await $postAsAdmin(editor, {
          editor: '<p><a href="https://example.com" target="javascript:alert(1)">x</a></p>',
        }),
      ).toEqual($422([{ editor: 'Invalid link target' }]))
    })

    test('rejects `<a>` with rel value containing invalid characters', async () => {
      expect(
        await $postAsAdmin(editor, {
          editor: '<p><a href="https://example.com" rel="noopener\nnoreferrer">x</a></p>',
        }),
      ).toEqual($422([{ editor: 'The `rel` value contains invalid characters' }]))
    })

    test('preserves entity-encoded query when populating rel:// href', async () => {
      const result = await $postAsAdmin(`${editor}&populate=t`, {
        editor: `<p><a href="rel://Routes:${routeId}/Articles:${articleId}?a=1&amp;b=2">x</a></p>`,
      })
      expect(result).toEqual([{ editor: '<p><a href="/editor-blog/editor-article?a=1&amp;b=2">x</a></p>' }])
    })

    test('cleanup: delete routes and article', async () => {
      await $deleteAsAdmin(`/api/collections/articles/${articleId}`)
      await $deleteAsAdmin(`/api/collections/routes/${routeId}`)
      await $deleteAsAdmin(`/api/collections/routes/${draftRouteId}`)
    })
  })
})
