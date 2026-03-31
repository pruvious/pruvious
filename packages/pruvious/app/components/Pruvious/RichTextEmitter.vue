<template>
  <PruviousRichTextController
    :blocks="blocks"
    :castedData="(proute?.data as any)._casted ?? {}"
    :data="proute?.data ?? {}"
    :fieldOptions="parsedFields[fieldPath] ?? ({} as any)"
    :fieldPath="fieldPath"
    :focusedBlocks="focusedBlocks"
    :focusNext="focusNext"
    :html="html"
    :parsedFields="parsedFields"
    :tag="tag"
    @deselectBlock="onDeselectBlock"
    @input="onInput"
    @queueBlockSelection="onQueueBlockSelection"
    @selectBlock="onSelectBlock"
    @update:blocksField="onUpdateBlocksField"
    @update:blocksFieldCasted="onUpdateBlocksFieldCasted"
    @update:castedData="onUpdateCastedData"
    @update:data="onUpdateData"
    @update:focusedBlocks="onUpdateFocusedBlocks"
    @update:focusNext="onUpdateFocusNext"
  />
</template>

<script lang="ts" setup>
import { usePruviousRoute } from '#pruvious/app'
import {
  parseFields,
  postMessageToDashboard,
  queueBlockSelection,
  queuePostMessageUpdates,
  usePreviewBlocks,
  usePreviewFocusedBlocks,
  usePreviewFocusNext,
  usePreviewParsedFields,
  usePreviewPublicFields,
} from '#pruvious/dashboard'
import type { BlockName } from '#pruvious/server'
import { isNull, setProperty } from '@pruvious/utils'

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
    type: String,
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

const proute = usePruviousRoute()
const publicFields = usePreviewPublicFields()
const parsedFields = usePreviewParsedFields()
const blocks = usePreviewBlocks()
const focusedBlocks = usePreviewFocusedBlocks()
const focusNext = usePreviewFocusNext()

function onUpdateData(newData: any) {
  if (proute.value) {
    proute.value.data = newData
  }
}

function onUpdateCastedData(newCastedData: any) {
  if (proute.value) {
    const data = proute.value.data as any
    data._casted = newCastedData
    parsedFields.value = parseFields(publicFields.value, newCastedData)
  }
}

function onUpdateBlocksField(fieldPath: string, fieldValue: any) {
  if (proute.value) {
    setProperty(proute.value.data, fieldPath, fieldValue)
  }
}

function onUpdateBlocksFieldCasted(fieldPath: string, fieldValue: any) {
  if (proute.value) {
    const data = proute.value.data as any
    setProperty(data._casted, fieldPath, fieldValue)
    queuePostMessageUpdates(fieldPath, fieldValue)
  }
}

function onUpdateFocusedBlocks(newFocusedBlocks: { path: string; block: BlockName; el: HTMLElement }[]) {
  if (proute.value) {
    focusedBlocks.value = newFocusedBlocks
  }
}

function onUpdateFocusNext(fieldPath: string | null, selection?: { from: number; to: number } | number) {
  if (proute.value) {
    focusNext.value = isNull(fieldPath) ? null : { path: fieldPath, selection, timestamp: Date.now() }
  }
}

function onInput(html: string) {
  if (proute.value) {
    setProperty(proute.value.data, props.fieldPath, html)
    setProperty((proute.value.data as any)._casted, props.fieldPath, html)
    queuePostMessageUpdates(props.fieldPath, html)
  }
}

function onSelectBlock(blockPath: string) {
  if (proute.value) {
    postMessageToDashboard({ name: 'iframe:selectBlock', path: blockPath })
  }
}

function onDeselectBlock() {
  if (proute.value) {
    postMessageToDashboard({ name: 'iframe:deselectBlocks' })
  }
}

function onQueueBlockSelection(blockPath: string) {
  if (proute.value) {
    queueBlockSelection(blockPath)
  }
}
</script>
