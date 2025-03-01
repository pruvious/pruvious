<template>
  <Showcase>
    <PUIPagination :currentPage="page" :lastPage="100" @change="page = $event" :style="{ '--pui-size': state.size }" />
    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const page = ref(1)
</script>
