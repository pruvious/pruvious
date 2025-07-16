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
      <!-- @todo resolve real path (<srcDir>/<...>) via /api/dev.get.ts (only available in dev mode) -->
      <pre><code>app/fields/{{ pascalCase(type) }}.vue</code></pre>
      <p>
        For more information, refer to the documentation:
        <a href="#components" target="_blank">Custom fields (@todo)</a>
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
