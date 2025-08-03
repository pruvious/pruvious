<template>
  <PUIAlert title="Missing field component">
    <template #icon>
      <Icon mode="svg" name="tabler:barrier-block" />
    </template>

    <PUIProse :spacing="-3" class="p-content">
      <p>
        The component for the field type
        <code>{{ type }}</code>
        is missing. Create the component at the specified path:
      </p>
      <pre><code>app/fields/{{ pascalCase(type) }}.vue</code></pre>
      <p>
        Check the
        <a href="https://pruvious.com/docs/custom-fields#components" target="_blank">Pruvious documentation</a>
        for more details on implementation.
      </p>
    </PUIProse>
  </PUIAlert>
</template>

<script lang="ts" setup>
import type { Fields } from '#pruvious/server'
import { pascalCase } from '@pruvious/utils'

defineProps({
  /**
   * The field type (e.g. `text`, `image`, `repeater`, etc.).
   */
  type: {
    type: String as PropType<keyof Fields>,
    required: true,
  },
})
</script>

<style scoped>
.p-content {
  --pui-line-height: 1.5em;
  margin-top: 0.5rem;
}
</style>
