<template>
  <PUIButton
    v-pui-tooltip="__('pruvious-dashboard', 'Scaffold new project')"
    @click="open = true"
    variant="outline"
  >
    <Icon mode="svg" name="tabler:wand" />
  </PUIButton>

  <ScaffoldFormPopup v-if="open" @close="$event().then(() => (open = false))" />
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/app'

defineOptions({ inheritAttrs: false })

const ScaffoldFormPopup = defineAsyncComponent(() => import('./ScaffoldForm.vue'))

const open = ref(false)
</script>
