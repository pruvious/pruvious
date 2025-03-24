<template>
  <Showcase>
    <div
      @contextmenu="contextMenu?.onContextMenu"
      @touchend="contextMenu?.onTouchEnd"
      @touchstart.prevent="contextMenu?.onTouchStart"
      class="area"
    >
      <span>Right click here</span>
      <PUIContextMenu v-model:event="event" :size="state.size" @click="event = null" ref="contextMenu">
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
      </PUIContextMenu>
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
const event = ref<MouseEvent | TouchEvent | null>(null)
const contextMenu = useTemplateRef('contextMenu')
</script>

<style scoped>
.area {
  display: flex;
  width: 24rem;
  max-width: 100%;
  height: 16rem;
}

.area > span {
  margin: auto;
  color: hsl(var(--pui-muted-foreground));
  font-size: 0.75em;
}
</style>
