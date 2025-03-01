<template>
  <Showcase>
    <PUIButton
      v-pui-tooltip="{
        content: 'This is a tooltip with `markdown` support',
        theme: state.hasErrors ? 'destructive' : undefined,
      }"
      :size="state.size"
    >
      Hover me
    </PUIButton>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
        <ShowcaseHasErrors />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
</script>
