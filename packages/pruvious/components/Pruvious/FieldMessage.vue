<template>
  <PUIFieldMessage v-if="error || description" :error="!!error">
    <p v-if="error">{{ error }}</p>

    <PUIProse v-else-if="description?.type === 'simple'" v-html="description.html" />

    <div v-else-if="description?.type === 'expandable'">
      <button @click="expanded = !expanded" class="p-field-description-toggle">
        <Icon mode="svg" name="tabler:chevron-right" :style="{ transform: expanded ? 'rotate(90deg)' : undefined }" />
        <span v-if="expanded">{{ description.hideLabel }}</span>
        <span v-else>{{ description.showLabel }}</span>
      </button>
      <PUIProse v-if="expanded" v-html="description.text" class="p-field-description-content" />
    </div>
  </PUIFieldMessage>
</template>

<script lang="ts" setup>
import { resolveFieldDescription } from '#pruvious/client'
import type { GenericSerializableFieldOptions } from '#pruvious/server'

const props = defineProps({
  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<GenericSerializableFieldOptions>,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },
})

const description = resolveFieldDescription(props.options.ui?.description)
const expanded = ref(description?.type === 'expandable' && description.expanded)
</script>

<style scoped>
.p-field-description-toggle {
  display: flex;
  gap: 0.25rem;
  text-decoration: none;
}

.p-field-description-toggle > svg {
  margin-top: 0.0825rem;
}

.p-field-description-content {
  margin: 0.25rem 0 0 1.25rem;
}
</style>
