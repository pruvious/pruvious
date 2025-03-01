<template>
  <Showcase>
    <div>
      <PUIButton :size="state.size" @click="isVisible = true">Open popup</PUIButton>
      <PUIPopup v-if="isVisible" :size="state.size" @close="$event().then(() => (isVisible = false))">
        <PUIProse :spacing="0">
          <ShowcaseProse />
        </PUIProse>
      </PUIPopup>
    </div>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const isVisible = ref(false)
</script>
