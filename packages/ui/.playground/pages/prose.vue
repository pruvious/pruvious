<template>
  <Showcase>
    <PUIProse :size="state.size" :spacing="spacing" class="pui-prose">
      <ShowcaseProse />
    </PUIProse>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="spacing">Spacing</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="spacing"
            :choices="[
              { label: '-2', value: -2 },
              { label: '-1', value: -1 },
              { label: '0', value: 0 },
              { label: '1', value: 1 },
              { label: '2', value: 2 },
            ]"
            :spacing="-2"
            id="spacing"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const spacing = ref(0)
</script>

<style scoped>
.pui-prose {
  width: 48rem;
}
</style>
