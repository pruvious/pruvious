<template>
  <PUIField v-if="!disabled">
    <PUIFieldLabel :required="operation === 'create'">
      <label v-if="operation === 'update'" :for="`${id}-switch`">
        {{ __('pruvious-dashboard', 'Change password') }}
      </label>
      <label v-else :for="id">{{ __('pruvious-dashboard', 'Password') }}</label>
    </PUIFieldLabel>

    <div class="pui-row">
      <PUIButtonGroup
        v-if="operation === 'update'"
        :choices="[
          { label: __('pruvious-dashboard', 'No'), value: false },
          { label: __('pruvious-dashboard', 'Yes'), value: true },
        ]"
        :id="`${id}-switch`"
        :modelValue="changePassword"
        :name="`${name}-switch`"
        @update:modelValue="
          (value) => {
            changePassword = Boolean(value)
            if (!value) {
              emit('commit', '')
            }
          }
        "
        variant="accent"
      />

      <PUIInput
        v-if="operation === 'create' || changePassword"
        :id="operation === 'update' ? `${id}-input` : id"
        :modelValue="modelValue"
        :name="operation === 'update' ? `${name}-input` : name"
        :placeholder="operation === 'update' ? __('pruvious-dashboard', 'New password') : undefined"
        :type="isPasswordVisible ? 'text' : 'password'"
        @blur="(_, value) => $emit('commit', value)"
        @update:modelValue="$emit('update:modelValue', $event)"
        autocomplete="new-password"
      >
        <template #suffix>
          <PUIButton
            :title="
              isPasswordVisible ? __('pruvious-dashboard', 'Hide password') : __('pruvious-dashboard', 'Show password')
            "
            :variant="isPasswordVisible ? 'accent' : 'ghost'"
            @click="isPasswordVisible = !isPasswordVisible"
            tabindex="-1"
          >
            <Icon v-if="isPasswordVisible" height="1.125em" mode="svg" name="tabler:eye" width="1.125em" />
            <Icon v-else height="1.125em" mode="svg" name="tabler:eye-off" width="1.125em" />
          </PUIButton>
        </template>
      </PUIInput>
    </div>

    <PUIFieldMessage v-if="error" error>{{ error }}</PUIFieldMessage>
  </PUIField>
</template>

<script lang="ts" setup>
import { __ } from '#pruvious/client'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: String,
    required: true,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * Represents an error message that can be displayed to the user.
   */
  error: {
    type: String,
  },

  /**
   * Controls whether the field is disabled.
   *
   * @default false
   */
  disabled: {
    type: Boolean,
    default: false,
  },

  /**
   * The current operation being performed.
   */
  operation: {
    type: String as PropType<'create' | 'update'>,
  },
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'commit': [value: string]
}>()

const id = useId()
const changePassword = ref(false)
const isPasswordVisible = ref(false)

watch(changePassword, (value) => {
  if (!value) {
    emit('update:modelValue', '')
  }
})

watch(
  () => props.modelValue,
  () => {
    changePassword.value = props.modelValue !== ''
  },
)
</script>
