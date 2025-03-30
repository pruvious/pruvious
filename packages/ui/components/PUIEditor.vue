<template>
  <div class="pui-editor">
    <editor-content :editor />
  </div>
</template>

<script lang="ts" setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: String,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (value == null) return
    if (!editor.value) return
    const hasChanged =
      typeof value === 'string'
        ? editor.value.getHTML() !== value
        : JSON.stringify(editor.value.getJSON()) !== JSON.stringify(value)
    if (!hasChanged) return
    editor.value?.commands.setContent(value)
  },
)
</script>

<style></style>
