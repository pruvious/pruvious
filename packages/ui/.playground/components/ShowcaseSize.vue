<template>
  <PUIField>
    <PUIFieldLabel>
      <label for="size">Size</label>
    </PUIFieldLabel>
    <PUIButtonGroup
      v-model="state.size"
      :choices="[
        { label: '-2', value: -2 },
        { label: '-1', value: -1 },
        { label: '0', value: 0 },
        { label: '1', value: 1 },
        { label: '2', value: 2 },
      ]"
      :size="-2"
      id="size"
    />
  </PUIField>
</template>

<script lang="ts" setup>
const state = useShowcase()

onMounted(() =>
  watch(
    () => state.value.size,
    (size) =>
      nextTick(() =>
        document.body.setAttribute(
          'style',
          `--pui-dialog-size: ${size}; --pui-toast-size: ${size}; --pui-tooltip-size: ${size}`,
        ),
      ),
    { immediate: true },
  ),
)

onUnmounted(() => {
  document.body.removeAttribute('style')
})
</script>
