<template>
  <PruviousRichText
    :data-field="parentBlockPath ? `${parentBlockPath}.${fieldPath}` : fieldPath"
    :key="tag"
    :modelValue="html"
    :placeholder="placeholder"
    :tag="tag"
    @commit="commit"
    @enterKey="onEnterKey()"
    @redo="onRedo()"
    @undo="onUndo()"
    @update:modelValue="key = nanoid()"
    ref="root"
  />
</template>

<script lang="ts" setup>
import {
  usePruviousPreviewFocusNext,
  usePruviousPreviewIsEditable,
  usePruviousPreviewKey,
  usePruviousRoute,
} from '#pruvious/client'
import { isStringInteger, nanoid } from '@pruvious/utils'

const props = defineProps({
  /**
   * The HTML content.
   */
  html: {
    type: String,
    required: true,
  },

  /**
   * The HTML tag name to use for the root element when rendering this component.
   */
  tag: {
    type: String as PropType<
      'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre' | 'ul' | 'ol' | 'li' | (string & {})
    >,
    required: true,
  },

  /**
   * The full field path in dot notation associated with the content of this component.
   *
   * @example
   * ```ts
   * 'text'
   * 'button.label'
   * 'products.0.productDescription'
   * ```
   */
  fieldPath: {
    type: String,
    required: true,
  },
})

const root = useTemplateRef('root')
const proute = usePruviousRoute()
const key = usePruviousPreviewKey()
const editable = usePruviousPreviewIsEditable() // @todo disable `PruviousRichText` if not editable
const focusNext = usePruviousPreviewFocusNext()
const fieldOptions = undefined // @todo resolve field options
const placeholder = undefined // @todo resolve placeholder from field options
const parentBlockPath = inject<string | undefined>('pruviousParentBlockPath')

watch(
  focusNext,
  (focus) => {
    if (focus?.path === props.fieldPath && focus.timestamp + 500 > Date.now()) {
      setTimeout(() => {
        root.value?.$el.focus()
      })
    }
  },
  { immediate: true },
)

function commit(value: string) {
  window.parent.postMessage(
    {
      name: 'iframe:update',
      key: key.value,
      path: props.fieldPath,
      value,
    },
    window.location.origin,
  )
}

function onEnterKey() {
  const blockPath = props.fieldPath.split('.').slice(0, -1).join('.')
  const indexString = blockPath.split('.').pop()
  const index = isStringInteger(indexString) ? +indexString : -1

  if (parentBlockPath === blockPath && index > -1) {
    const newPath = `${blockPath.split('.').slice(0, -1).join('.')}.${index + 1}.${props.fieldPath.split('.').pop()}`
    window.parent.postMessage({ name: 'iframe:addBlockAfter', path: parentBlockPath }, window.location.origin)
    focusNext.value = { path: newPath, timestamp: Date.now() }
  }
}

function onUndo() {
  window.parent.postMessage({ name: 'iframe:undo' }, window.location.origin)
}

function onRedo() {
  window.parent.postMessage({ name: 'iframe:redo' }, window.location.origin)
}
</script>
