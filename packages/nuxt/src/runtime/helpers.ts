import { EditorToolbarItem, OptimizedImage, OptimizedWebpImage } from '@pruvious/shared'

export function getKeyNameArray(value: string): { key: string; name: string; array: string[] } {
  let key: string = ''
  let name: string = ''
  let space: boolean = false
  let brackets: number = 0
  let array: string = ''

  for (const c of value) {
    if (c === ' ' && !space) {
      space = true
    } else if (c === '[') {
      brackets++
    } else if (c === ']') {
      brackets--

      if (!brackets) {
        array += ','
      }
    } else if (brackets) {
      array += c
    } else if (space) {
      name += c
    } else {
      key += c
    }
  }

  return {
    key: key.trim(),
    name: name.trim(),
    array: array
      .split(',')
      .filter(Boolean)
      .map((v) => v.trim()),
  }
}

export function getDuplicatesInArray(array: string[]): string[] {
  const sorted = array.slice().sort()
  const results = []

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] === sorted[i]) {
      results.push(sorted[i])
    }
  }
  return [...new Set(results)]
}

export function getImageSourceParams(value: string): {
  params: OptimizedImage
  errors: Record<string, string>
} {
  const params: OptimizedImage = {}
  const errors: Record<string, string> = {}

  value = ` ${value}`

  if (value.trim().endsWith(')')) {
    params.media = value.trim()
  } else {
    const regex = /\s*(\(.+\))?\s+([^\s]+)/gs
    const optimizations: string[] = []

    let match: RegExpExecArray | null = null

    do {
      match = regex.exec(value)

      if (match) {
        if (match[1] && !params.media) {
          params.media = match[1]
        }

        if (match[2] === 'jpg') {
          optimizations.push('jpeg')
        } else {
          optimizations.push(match[2])
        }
      }
    } while (match)

    for (const o of optimizations) {
      if (o.startsWith('w-') || o.startsWith('width-')) {
        const value = o.replace('w-', '').replace('width-', '')

        if (!value) {
          errors[o] = 'Missing width value.'
        } else if (Math.floor(+value) !== +value) {
          errors[o] = 'The width value must be an integer.'
        } else if (+value <= 0) {
          errors[o] = 'The width value must be greater than 0.'
        } else {
          params.width = +value
        }
      } else if (o.startsWith('h-') || o.startsWith('height-')) {
        const value = o.replace('h-', '').replace('height-', '')

        if (!value) {
          errors[o] = 'Missing height value.'
        } else if (Math.floor(+value) !== +value) {
          errors[o] = 'The height value must be an integer.'
        } else if (+value <= 0) {
          errors[o] = 'The height value must be greater than 0.'
        } else {
          params.height = +value
        }
      } else if (o === 'jpeg' || o === 'png' || o === 'webp') {
        params.format = o
      } else if (
        o === 'cover' ||
        o === 'contain' ||
        o === 'fill' ||
        o === 'inside' ||
        o === 'outside'
      ) {
        params.resize = o
      } else if (
        o === 'top' ||
        o === 'topRight' ||
        o === 'right' ||
        o === 'bottomRight' ||
        o === 'bottom' ||
        o === 'bottomLeft' ||
        o === 'left' ||
        o === 'topLeft'
      ) {
        params.position = o
      } else if (
        o === 'cubic' ||
        o === 'lanczos2' ||
        o === 'lanczos3' ||
        o === 'mitchell' ||
        o === 'nearest'
      ) {
        params.interpolation = o
      } else if (o.startsWith('q-') || o.startsWith('quality-')) {
        const value = o.replace('q-', '').replace('quality-', '')

        if (!value) {
          errors[o] = 'Missing quality value.'
        } else if (Math.floor(+value) !== +value) {
          errors[o] = 'The quality value must be an integer.'
        } else if (+value < 0 || +value > 100) {
          errors[o] = 'The quality value must be between 0 and 100.'
        } else {
          params.quality = +value as any
        }
      } else if (o.startsWith('aq-') || o.startsWith('alphaQuality-')) {
        const value = o.replace('aq-', '').replace('alphaQuality-', '')

        if (!optimizations.includes('webp')) {
          errors[o] = 'The alphaQuality parameter can only be used on webp images.'
        } else if (!value) {
          errors[o] = 'Missing alpha quality value.'
        } else if (Math.floor(+value) !== +value) {
          errors[o] = 'The alpha quality value must be an integer.'
        } else if (+value < 0 || +value > 100) {
          errors[o] = 'The alpha quality value must be between 0 and 100.'
        } else {
          ;(params as OptimizedWebpImage).alphaQuality = +value as any
        }
      } else if (o === 'lossless' || o === 'nearLossless' || o === 'smartSubsample') {
        if (!optimizations.includes('webp')) {
          errors[o] = `The ${o} parameter can only be used on webp images.`
        } else {
          ;(params as OptimizedWebpImage)[o] = true
        }
      } else {
        errors[o] = `Invalid parameter: ${o}`
      }
    }
  }

  return { params, errors }
}

export const editorToolbarItems: EditorToolbarItem[] = [
  'blockFormats',
  'blockquote',
  'bold',
  'bulletList',
  'center',
  'clear',
  'code',
  'codeBlock',
  'fullscreen',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'hardBreak',
  'highlight',
  'horizontalRule',
  'inlineFormats',
  'italic',
  'justify',
  'left',
  'link',
  'normalize',
  'orderedList',
  'paragraph',
  'redo',
  'right',
  'strike',
  'subscript',
  'superscript',
  'underline',
  'undo',
]
