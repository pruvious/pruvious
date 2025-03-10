<template>
  <Showcase>
    <PUIStructure
      v-model="value"
      :disabled="disabled"
      :isDraggable="isDraggable"
      :resolveItemType="(item) => ('alt' in item ? 'image' : 'video')"
      :size="state.size"
      :types="['image', 'video']"
      class="pui-structure"
    >
      <template #header="{ index, disabled }">
        <span>#{{ index }}</span>
        <PUIButton
          :disabled="disabled"
          :size="state.size - 1"
          @click="value.splice(index, 1)"
          destructiveHover
          variant="ghost"
          class="pui-ml-auto"
        >
          <Icon mode="svg" name="tabler:trash" />
        </PUIButton>
      </template>

      <template #item="{ item, disabled }">
        <div v-if="'alt' in item" class="pui-row">
          <div class="pui-flex-1">
            <PUIField>
              <PUIFieldLabel>
                <label for="src">Source</label>
              </PUIFieldLabel>
              <PUIInput v-model="item.src" :disabled="disabled" id="src" name="src" />
            </PUIField>
          </div>
          <div class="pui-flex-1">
            <PUIField>
              <PUIFieldLabel>
                <label for="alt">Alt</label>
              </PUIFieldLabel>
              <PUIInput v-model="item.alt" :disabled="disabled" id="alt" name="alt" />
            </PUIField>
          </div>
        </div>
        <div v-else class="pui-row">
          <div class="pui-flex-1">
            <PUIField>
              <PUIFieldLabel>
                <label for="src">Source</label>
              </PUIFieldLabel>
              <PUIInput v-model="item.src" :disabled="disabled" id="src" name="src" />
            </PUIField>
          </div>
          <div class="pui-flex-1">
            <PUIField>
              <PUIFieldLabel>
                <label for="autoplay">Autoplay</label>
              </PUIFieldLabel>
              <PUISwitch v-model="item.autoplay" :disabled="disabled" id="autoplay" name="autoplay" />
            </PUIField>
          </div>
        </div>
      </template>
    </PUIStructure>

    <div v-if="!disabled" class="pui-structure-add-item">
      <PUIButton
        :size="state.size"
        :variant="isAddItemMenuVisible ? 'primary' : 'outline'"
        @click="isAddItemMenuVisible = true"
        ref="addItemButton"
      >
        <Icon mode="svg" name="tabler:plus" />
        <span>Add item</span>
      </PUIButton>
      <PUIDropdown
        v-if="isAddItemMenuVisible"
        :reference="addItemButton?.$el"
        :size="state.size"
        @click="isAddItemMenuVisible = false"
        @close="isAddItemMenuVisible = false"
      >
        <PUIDropdownItem v-for="type of ['image', 'video']" @click="value.push(addItem(type as any))">
          <span>{{ capitalize(type) }}</span>
        </PUIDropdownItem>
      </PUIDropdown>
    </div>

    <template #config>
      <ShowcaseConfig>
        <PUIField>
          <PUIFieldLabel>
            <label for="isDraggable">Draggable</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="isDraggable"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            id="isDraggable"
          />
        </PUIField>

        <ShowcaseSize />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { capitalize } from '@pruvious/utils'
import PUIButton from '../../components/PUIButton.vue'

interface Image {
  src: string
  alt: string
}

interface Video {
  src: string
  autoplay: boolean
}

const state = useShowcase()
const isDraggable = ref(true)
const disabled = ref(false)
const value = ref<(Video | Image)[]>([])
const addItemButton = useTemplateRef('addItemButton')
const isAddItemMenuVisible = ref(false)

function addItem(type: 'image' | 'video'): Image | Video {
  return type === 'image' ? { src: '', alt: '' } : { src: '', autoplay: false }
}
</script>

<style scoped>
.pui-structure {
  --pui-gap: 0.5rem;
  width: 48rem;
  max-width: 100%;
}

.pui-structure:not(.pui-structure-empty) + .pui-structure-add-item {
  margin-top: 0.5rem;
}

.pui-row {
  gap: 0.75rem;
}
</style>
