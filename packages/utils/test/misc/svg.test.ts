import { describe, expect, test } from 'vitest'
import { isSvgBuffer, sanitizeSvg } from '../../src'

describe('isSvgBuffer', () => {
  test('detects SVG in a string', () => {
    expect(isSvgBuffer('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(true)
  })

  test('detects SVG in a Buffer', () => {
    expect(isSvgBuffer(Buffer.from('<?xml version="1.0"?>\n<svg></svg>'))).toBe(true)
  })

  test('detects SVG in a Uint8Array', () => {
    expect(isSvgBuffer(new TextEncoder().encode('<svg></svg>'))).toBe(true)
  })

  test('rejects non-SVG markup', () => {
    expect(isSvgBuffer('<html><body></body></html>')).toBe(false)
  })

  test('rejects binary data', () => {
    expect(isSvgBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
  })

  test('requires word-boundary after svg to avoid false positives', () => {
    expect(isSvgBuffer('<svgfake></svgfake>')).toBe(false)
  })
})

describe('sanitizeSvg', () => {
  test('returns empty result for input without an <svg> element', () => {
    expect(sanitizeSvg('<html></html>')).toEqual({ svg: '', removed: [] })
  })

  test('keeps a clean SVG untouched', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).toBe(input)
    expect(removed).toEqual([])
  })

  test('strips <script> elements', () => {
    const { svg, removed } = sanitizeSvg('<svg><script>alert(1)</script><circle/></svg>')
    expect(svg).not.toMatch(/script/i)
    expect(svg).toContain('<circle')
    expect(removed).toContain('script')
  })

  test('strips self-closing <script> elements', () => {
    const { svg, removed } = sanitizeSvg('<svg><script src="evil.js"/></svg>')
    expect(svg).not.toMatch(/script/i)
    expect(removed).toContain('script')
  })

  test('strips <script> with mixed casing and attributes', () => {
    const { svg, removed } = sanitizeSvg('<svg><ScRiPt type="text/javascript">payload</ScRiPt></svg>')
    expect(svg).not.toMatch(/script/i)
    expect(removed).toContain('script')
  })

  test('strips on* event handler attributes', () => {
    const { svg, removed } = sanitizeSvg('<svg onload="alert(1)"><a onclick="x()" href="#">hi</a></svg>')
    expect(svg).not.toMatch(/onload/i)
    expect(svg).not.toMatch(/onclick/i)
    expect(removed).toContain('on*')
  })

  test('strips event handler attributes regardless of quote style', () => {
    const { svg } = sanitizeSvg(`<svg onload='alert(1)' onerror=alert(2)><rect/></svg>`)
    expect(svg).not.toMatch(/onload|onerror/i)
  })

  test('strips <foreignObject>', () => {
    const input = '<svg><foreignObject><iframe src="x"></iframe></foreignObject></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).not.toMatch(/foreignObject/i)
    expect(svg).not.toMatch(/iframe/i)
    expect(removed).toContain('foreignobject')
  })

  test('strips SMIL animate elements that can carry event handlers', () => {
    const input = `<svg><a href="?"><animate attributeName="href" values="javascript:alert(1)" begin="0"/></a></svg>`
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).not.toMatch(/animate/i)
    expect(removed).toContain('animate')
  })

  test('strips href values using javascript: scheme', () => {
    const { svg, removed } = sanitizeSvg('<svg><a href="javascript:alert(1)">x</a></svg>')
    expect(svg).not.toMatch(/javascript:/i)
    expect(removed).toContain('href')
  })

  test('strips xlink:href values using javascript: scheme', () => {
    const { svg, removed } = sanitizeSvg(`<svg><use xlink:href="javascript:alert(1)"/></svg>`)
    expect(svg).not.toMatch(/javascript:/i)
    expect(removed).toContain('xlink:href')
  })

  test('strips HTML-entity-obfuscated javascript: schemes', () => {
    const { svg } = sanitizeSvg('<svg><a href="&#106;avascript:alert(1)">x</a></svg>')
    expect(svg).not.toMatch(/javascript:|&#106;avascript:/i)
  })

  test('strips data: URIs except inline images', () => {
    const { svg: dropped } = sanitizeSvg(
      '<svg><image href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="/></svg>',
    )
    expect(dropped).not.toContain('data:text/html')

    const { svg: kept } = sanitizeSvg('<svg><image href="data:image/png;base64,AAA"/></svg>')
    expect(kept).toContain('data:image/png')
  })

  test('blocks nested data:image/svg+xml URIs', () => {
    const { svg, removed } = sanitizeSvg(
      '<svg><image href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PjwvL3NjcmlwdD48L3N2Zz4="/></svg>',
    )
    expect(svg).not.toContain('data:image/svg+xml')
    expect(removed).toContain('href')
  })

  test('blocks external http/https references', () => {
    const { svg, removed } = sanitizeSvg('<svg><use href="https://attacker.com/x.svg#x"/></svg>')
    expect(svg).not.toContain('attacker.com')
    expect(removed).toContain('href')
  })

  test('allows in-document fragment references', () => {
    const input = '<svg><defs><circle id="c" r="5"/></defs><use href="#c"/></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).toContain('href="#c"')
    expect(removed).toEqual([])
  })

  test('removes <style> blocks with expression()', () => {
    const { svg, removed } = sanitizeSvg('<svg><style>rect { width: expression(alert(1)); }</style><rect/></svg>')
    expect(svg).not.toMatch(/<style/i)
    expect(svg).not.toMatch(/expression/i)
    expect(removed).toContain('style')
  })

  test('removes <style> blocks with @import', () => {
    const { svg, removed } = sanitizeSvg('<svg><style>@import url("https://x/x.css");</style><rect/></svg>')
    expect(svg).not.toMatch(/<style/i)
    expect(removed).toContain('style')
  })

  test('removes <style> blocks with external url() references', () => {
    const { svg } = sanitizeSvg('<svg><style>rect { fill: url(https://x/x.svg#g); }</style></svg>')
    expect(svg).not.toMatch(/<style/i)
  })

  test('keeps <style> blocks with safe url() references', () => {
    const input = '<svg><style>rect { fill: url(#gradient); }</style><rect/></svg>'
    const { svg } = sanitizeSvg(input)
    expect(svg).toContain('<style>')
    expect(svg).toContain('url(#gradient)')
  })

  test('removes inline style attributes with dangerous CSS', () => {
    const { svg, removed } = sanitizeSvg('<svg><rect style="behavior: url(#x)"/></svg>')
    expect(svg).not.toMatch(/behavior/i)
    expect(removed).toContain('style-attr')
  })

  test('strips XML processing instructions before <svg>', () => {
    const input = `<?xml version="1.0"?>\n<?xml-stylesheet href="evil.xsl" type="text/xsl"?>\n<svg><rect/></svg>`
    const { svg, removed } = sanitizeSvg(input)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).not.toMatch(/xml-stylesheet/i)
    expect(removed).toContain('xml-stylesheet')
  })

  test('strips DOCTYPE and ENTITY declarations', () => {
    const input = `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n<svg><text>&xxe;</text></svg>`
    const { svg, removed } = sanitizeSvg(input)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).not.toMatch(/DOCTYPE|ENTITY/i)
    expect(removed).toContain('doctype')
    expect(removed).toContain('entity')
  })

  test('strips trailing markup after </svg>', () => {
    const input = '<svg><rect/></svg><script>alert(1)</script>'
    const { svg } = sanitizeSvg(input)
    expect(svg).toBe('<svg><rect/></svg>')
  })

  test('strips comments to prevent comment-smuggled markup', () => {
    const input = '<svg><!-- <script>alert(1)</script> --><rect/></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).not.toMatch(/script|<!--/)
    expect(removed).toContain('comment')
  })

  test('unwraps CDATA sections so their contents are sanitized', () => {
    const { svg, removed } = sanitizeSvg('<svg><![CDATA[<script>alert(1)</script>]]></svg>')
    expect(svg).not.toMatch(/script/i)
    expect(removed).toContain('cdata')
  })

  test('preserves self-closing slash on tags', () => {
    const { svg } = sanitizeSvg('<svg><circle cx="5" cy="5" r="4" onclick="x()"/></svg>')
    expect(svg).toMatch(/<circle [^>]*\/>/)
    expect(svg).not.toMatch(/onclick/i)
  })

  test('accepts a Buffer input', () => {
    const { svg } = sanitizeSvg(Buffer.from('<svg onload="x"><rect/></svg>'))
    expect(svg).not.toMatch(/onload/i)
    expect(svg).toContain('<rect')
  })

  test('accepts a Uint8Array input', () => {
    const { svg } = sanitizeSvg(new TextEncoder().encode('<svg><script>x</script></svg>'))
    expect(svg).not.toMatch(/script/i)
  })

  test('strips namespaced <xhtml:script> (V1)', () => {
    const input = '<svg xmlns:xhtml="http://www.w3.org/1999/xhtml"><xhtml:script>alert(1)</xhtml:script></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).not.toMatch(/script/i)
    expect(removed).toContain('script')
  })

  test('strips namespaced <svg:script>', () => {
    const { svg } = sanitizeSvg('<svg><svg:script>alert(1)</svg:script></svg>')
    expect(svg).not.toMatch(/script/i)
  })

  test('strips <animateColor> (V5)', () => {
    const input = '<svg><animateColor attributeName="x" values="javascript:alert(1)"/></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).not.toMatch(/animateColor/i)
    expect(removed).toContain('animatecolor')
  })

  test('blocks external url() in filter attribute (V4)', () => {
    const { svg, removed } = sanitizeSvg('<svg><rect filter="url(https://evil/x.svg#f)"/></svg>')
    expect(svg).not.toContain('evil')
    expect(removed).toContain('filter')
  })

  test('blocks external url() in mask attribute', () => {
    const { svg } = sanitizeSvg('<svg><rect mask="url(https://evil/x.svg#m)"/></svg>')
    expect(svg).not.toContain('evil')
  })

  test('keeps in-document url() refs on presentation attrs', () => {
    const input = '<svg><rect filter="url(#blur)" mask="url(#m)"/></svg>'
    const { svg, removed } = sanitizeSvg(input)
    expect(svg).toContain('filter="url(#blur)"')
    expect(svg).toContain('mask="url(#m)"')
    expect(removed).toEqual([])
  })

  test('accepts <svg/> self-closing root (V7)', () => {
    expect(isSvgBuffer('<svg/>')).toBe(true)
    expect(isSvgBuffer('<svg/>'.padStart(10, ' '))).toBe(true)
  })

  test('accepts SVGs with prologues larger than 1 KiB (V6)', () => {
    const prologue = '<!--' + ' '.repeat(2000) + '-->'
    const input = `${prologue}\n<svg><rect/></svg>`
    expect(isSvgBuffer(input)).toBe(true)
    const { svg } = sanitizeSvg(input)
    expect(svg).toBe('<svg><rect/></svg>')
  })

  test('removed list is deduplicated and sorted', () => {
    const { removed } = sanitizeSvg(
      '<svg onload="x" onclick="y"><script>1</script><script>2</script><a href="javascript:1"></a></svg>',
    )
    expect(removed).toEqual([...new Set(removed)].sort())
  })
})
