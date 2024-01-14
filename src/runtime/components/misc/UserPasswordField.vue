<template>
  <div
    class="max-w-full flex-1"
    :class="{
      'w-full space-y-4 p-4': compact,
      'flex divide-x': !compact,
    }"
  >
    <component
      v-if="record.id"
      v-model="changePassword"
      :disabled="disabled"
      :is="SwitchField"
      :options="{
        label: 'Change password',
      }"
      @update:modelValue="$emit('update:record', { ...record, password: $event ? '' : undefined })"
      fieldKey="_changePassword"
      name="_changePassword"
      class="!w-auto"
      :class="{ 'p-4': !compact }"
    />

    <component
      v-if="record.id && changePassword"
      :disabled="disabled"
      :errors="errors"
      :is="TextField"
      :modelValue="record.password ?? ''"
      :options="{
        ...collection.fields.password.options as any,
        label: 'New password',
      }"
      @update:modelValue="$emit('update:record', { ...record, password: $event })"
      fieldKey="password"
      name="password"
      :class="{ 'p-4': !compact }"
    />

    <component
      v-if="!record.id"
      :disabled="disabled"
      :errors="errors"
      :is="TextField"
      :modelValue="record.password"
      :options="(collection.fields.password.options as any)"
      @update:modelValue="$emit('update:record', { ...record, password: $event })"
      fieldKey="password"
      name="password"
      :class="{ 'p-4': !compact }"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { switchFieldComponent, textFieldComponent } from '#pruvious/dashboard'
import { usePruviousDashboard } from '../../composables/dashboard/dashboard'
import { loadTranslatableStrings } from '../../composables/translatable-strings'
import { isUndefined } from '../../utils/common'

const props = defineProps<{
  record: Record<string, any>
  errors: Record<string, string>
  compact: boolean
  disabled: boolean
}>()

defineEmits<{
  'update:record': [Record<string, any>]
}>()

const dashboard = usePruviousDashboard()

const changePassword = ref(false)
const collection = dashboard.value.collections[dashboard.value.collection!]

const SwitchField = switchFieldComponent()
const TextField = textFieldComponent()

watch(
  () => props.record.password,
  () => {
    if (changePassword.value && isUndefined(props.record.password)) {
      changePassword.value = false
    }
  },
)

await loadTranslatableStrings('pruvious-dashboard')
</script>
