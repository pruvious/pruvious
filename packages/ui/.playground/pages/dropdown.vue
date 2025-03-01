<template>
  <Showcase>
    <div :style="{ '--pui-size': state.size }">
      <PUIButton :size="state.size" @click="isVisible = true" ref="button">Open dropdown</PUIButton>
      <PUIDropdown v-if="isVisible" :reference="button?.$el" @click="isVisible = false" @close="isVisible = false">
        <PUIDropdownItem @click="puiToast('Clicked on `Action label`')">Action label</PUIDropdownItem>
        <hr />
        <PUIDropdownItem @click="puiToast('Clicked on `Copy`')">
          <Icon mode="svg" name="tabler:copy" />
          <span>Copy</span>
        </PUIDropdownItem>
        <PUIDropdownItem @click="puiToast('Clicked on `Cut`')">
          <Icon mode="svg" name="tabler:cut" />
          <span>Cut</span>
        </PUIDropdownItem>
        <PUIDropdownItem @click="puiToast('Clicked on `Paste`')">
          <Icon mode="svg" name="tabler:clipboard" />
          <span>Paste</span>
        </PUIDropdownItem>
      </PUIDropdown>
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
const button = useTemplateRef('button')
const isVisible = ref(false)
</script>
