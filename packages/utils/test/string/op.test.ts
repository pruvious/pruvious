import { expect, test } from 'vitest'
import { excerpt, extractKeywords } from '../../src'
import { countCommonPrefix, escapeHTML, normalizeWhitespace } from '../../src/string/op'

test('extract keywords', () => {
  expect(extractKeywords('foo')).toEqual(['foo'])
  expect(extractKeywords('foo bar')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' Foo  BAR ')).toEqual(['foo', 'bar'])
  expect(extractKeywords(' ')).toEqual([])
  expect(extractKeywords(' ! ?? ')).toEqual(['!', '??'])
})

test('excerpt', () => {
  expect(excerpt('Lorem ipsum dolor sit amet', { words: 3 })).toEqual('Lorem ipsum dolor')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 10 })).toEqual('Lorem ipsu')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 10, includeLastWord: true })).toEqual('Lorem ipsum')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 100 })).toEqual('Lorem ipsum dolor sit amet')
  expect(excerpt('Lorem ipsum dolor sit amet', { words: 0 })).toEqual('')
  expect(excerpt('Lorem ipsum dolor sit amet', { characters: 0 })).toEqual('')
})

test('normalize whitespace', () => {
  expect(normalizeWhitespace(' Hello, World! ')).toEqual('Hello, World!')
  expect(normalizeWhitespace('  Hello,  World!  ')).toEqual('Hello, World!')
  expect(normalizeWhitespace(' <strong> Hello, </strong>World! ')).toEqual('<strong>Hello,</strong> World!')
  expect(normalizeWhitespace(' <strong> Hello </strong>, World! ')).toEqual('<strong>Hello</strong> , World!')
  expect(normalizeWhitespace('<strong>Hello, </strong><strong>World!</strong>')).toEqual(
    '<strong>Hello,</strong> <strong>World!</strong>',
  )
  expect(normalizeWhitespace('Hello<strong>, </strong> World!')).toEqual('Hello<strong>,</strong> World!')
  expect(normalizeWhitespace('<p class="foo">  bar  baz  </p>')).toEqual('<p class="foo">bar baz</p>')
  expect(normalizeWhitespace('<p  class="< "  >  bar  baz  </p>  <p>qux</p>')).toEqual(
    '<p class="< ">bar baz</p> <p>qux</p>',
  )
  expect(normalizeWhitespace('<p>foo</p> <p>bar</p>')).toEqual('<p>foo</p> <p>bar</p>')
  expect(normalizeWhitespace('<p>foo</p>  <p>bar</p>')).toEqual('<p>foo</p> <p>bar</p>')
  expect(normalizeWhitespace('<p>foo</p><p>bar</p>')).toEqual('<p>foo</p><p>bar</p>')
  expect(normalizeWhitespace('<p>foo </p><p>bar</p>')).toEqual('<p>foo</p> <p>bar</p>')
  expect(normalizeWhitespace('<p>foo</p><p> bar</p>')).toEqual('<p>foo</p> <p>bar</p>')
  expect(normalizeWhitespace('<p>foo</p> <br> <p>bar</p>')).toEqual('<p>foo</p><br> <p>bar</p>')
  expect(normalizeWhitespace('<p> <strong> foo<span> bar</span> </strong> </p>')).toEqual(
    '<p><strong>foo <span>bar</span></strong></p>',
  )
  expect(normalizeWhitespace('foo&nbsp; bar')).toEqual('foo&nbsp; bar')
  expect(normalizeWhitespace('foo   &nbsp;   bar')).toEqual('foo &nbsp; bar')
  expect(normalizeWhitespace('a <b> b </b> c')).toEqual('a <b>b</b> c')
  expect(normalizeWhitespace('a<b>b</b>c')).toEqual('a<b>b</b>c')
  expect(normalizeWhitespace('a<b> b</b>c')).toEqual('a <b>b</b>c')
  expect(normalizeWhitespace('a<b>b </b>c')).toEqual('a<b>b</b> c')
  expect(normalizeWhitespace('<div> <span> <strong>  foo  </ strong > </span> </div>')).toEqual(
    '<div><span><strong>foo</strong></span></div>',
  )
  expect(normalizeWhitespace('<div> <span> <strong>  foo  </strong> <em> bar </em> </span> </div>')).toEqual(
    '<div><span><strong>foo</strong> <em>bar</em></span></div>',
  )
  expect(normalizeWhitespace('foo <br> bar')).toEqual('foo<br> bar')
  expect(normalizeWhitespace('foo<br>bar')).toEqual('foo<br>bar')
  expect(normalizeWhitespace('<img src="foo.png"  alt="  bar  "  />')).toEqual('<img src="foo.png" alt="  bar  "/>')
  expect(normalizeWhitespace('<b>   </b>')).toEqual('<b></b>')
  expect(normalizeWhitespace('<div>   </div>')).toEqual('<div></div>')
})

test('escape html', () => {
  expect(escapeHTML('foo')).toEqual('foo')
  expect(escapeHTML("'foo'")).toEqual('&#039;foo&#039;')
  expect(escapeHTML('<div>Hello & "world"</div>')).toEqual('&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;')
  expect(escapeHTML('')).toEqual('')
  expect(escapeHTML(' ')).toEqual(' ')
})

test('count common prefix characters', () => {
  expect(countCommonPrefix('foo', 'foobar')).toEqual(3)
  expect(countCommonPrefix('foobar', 'foo')).toEqual(3)
  expect(countCommonPrefix('foo', 'bar')).toEqual(0)
  expect(countCommonPrefix('foobar', 'foobaz')).toEqual(5)
  expect(countCommonPrefix('foobar', 'fOobaz')).toEqual(1)
  expect(countCommonPrefix('foobar', ' foobaz')).toEqual(0)
})
