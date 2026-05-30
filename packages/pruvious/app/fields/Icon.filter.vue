<template>
  <PruviousFilterField
    :modelValue="modelValue"
    :operatorChoices="operatorChoices"
    :options="options"
    @commit="$emit('commit', $event)"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div v-if="modelValue.value !== undefined" class="pui-row">
      <template v-if="!isEmpty(modelValue.value as string | null)">
        <PUIButton
          v-pui-tooltip="modelValue.value as string"
          @click="isPickerVisible = true"
          variant="outline"
          class="pui-shrink"
        >
          <span class="pui-truncate">{{ modelValue.value }}</span>
        </PUIButton>

        <PUIButton
          v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
          @click="
            () => {
              $emit('update:modelValue', { ...modelValue, value: null })
              $emit('commit', { ...modelValue, value: null })
            }
          "
          variant="outline"
        >
          <NuxtIcon mode="svg" name="tabler:x" />
        </PUIButton>
      </template>

      <PUIButton v-else @click="isPickerVisible = true" variant="outline" class="pui-shrink">
        <span class="pui-truncate">{{ placeholder || __('pruvious-dashboard', 'Pick an icon') }}</span>
      </PUIButton>
    </div>

    <PruviousDashboardIconPickerPopup
      v-if="isPickerVisible"
      :columns="columns"
      :dir="dir"
      :modelValue="modelValue.value as string | null"
      @close="
        $event().then(() => {
          isPickerVisible = false
        })
      "
      @pick="
        (name, close) => {
          $emit('update:modelValue', { ...modelValue, value: name })
          $emit('commit', { ...modelValue, value: name })
          close().then(() => {
            isPickerVisible = false
          })
        }
      "
    />
  </PruviousFilterField>
</template>

<script lang="ts" setup>
import { Icon as NuxtIcon } from '#components'
import { __ } from '#pruvious/app'
import { getValidFilterOperators, maybeTranslate, type WhereField } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import { clamp, isEmpty } from '@pruvious/utils'

const props = defineProps({
  /**
   * The current where condition.
   */
  modelValue: {
    type: Object as PropType<WhereField>,
    required: true,
  },

  /**
   * The combined field options defined in a collection.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'icon'>>,
    required: true,
  },
})

defineEmits<{
  'commit': [where: WhereField]
  'update:modelValue': [where: WhereField]
}>()

const placeholder = maybeTranslate(props.options.ui.placeholder)
const isPickerVisible = ref(false)
const operatorChoices = getValidFilterOperators(props.options).filter(({ value }) => ['eq', 'ne'].includes(value))

const dir = computed(() => props.options.dir ?? '')
const columns = computed(() => clamp(props.options.ui.columns ?? 6, 1, 12))
</script>
