<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div class="pui-row">
      <template v-if="!isEmpty(modelValue)">
        <div :class="['p-icon-preview p-media-item-box', backgroundClass]">
          <button
            :disabled="disabled"
            :title="modelValue!"
            @click="isPickerVisible = true"
            type="button"
            class="p-icon-preview-button pui-raw"
          >
            <img :alt="modelValue!" :src="previewUrl!" class="p-icon-preview-image" />
          </button>
        </div>

        <div class="p-icon-details">
          <div>
            <span :title="modelValue!" class="p-icon-name pui-truncate">{{ modelValue }}</span>
          </div>

          <span :title="sourceDir" class="p-icon-source pui-truncate">{{ sourceDir }}</span>

          <div class="pui-row">
            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Replace')"
              :disabled="disabled"
              @click="isPickerVisible = true"
              variant="outline"
            >
              <NuxtIcon mode="svg" name="tabler:replace" />
            </PUIButton>

            <PUIButton
              v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
              :disabled="disabled"
              @click="clear"
              variant="outline"
            >
              <NuxtIcon mode="svg" name="tabler:x" />
            </PUIButton>
          </div>
        </div>
      </template>

      <template v-else>
        <PUIButton :disabled="disabled" @click="isPickerVisible = true" variant="outline" class="pui-shrink">
          <span class="pui-truncate">{{ placeholder || __('pruvious-dashboard', 'Pick an icon') }}</span>
        </PUIButton>
      </template>
    </div>

    <input :name="path" :value="modelValue ?? ''" hidden />

    <PruviousDashboardIconPickerPopup
      v-if="isPickerVisible"
      :background="background"
      :columns="columns"
      :dir="dir"
      :modelValue="modelValue"
      @close="
        $event().then(() => {
          isPickerVisible = false
        })
      "
      @pick="
        (name, close) => {
          $emit('update:modelValue', name)
          $emit('commit', name)
          close().then(() => {
            isPickerVisible = false
          })
        }
      "
    />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { Icon as NuxtIcon } from '#components'
import { __, buildIconUrl } from '#pruvious/app'
import { maybeTranslate } from '#pruvious/dashboard'
import type { PruviousIconDir, SerializableFieldOptions } from '#pruvious/server'
import { clamp, isEmpty } from '@pruvious/utils'

const props = defineProps({
  /**
   * The casted field value.
   */
  modelValue: {
    type: String as PropType<string | null>,
    default: null,
  },

  /**
   * The field name defined in a collection, singleton, or block.
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * The combined field options defined in a collection, singleton, or block.
   */
  options: {
    type: Object as PropType<SerializableFieldOptions<'icon'>>,
    required: true,
  },

  /**
   * The field path, expressed in dot notation, represents the exact location of the field within the current data structure.
   */
  path: {
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
   * Specifies whether the current data record is translatable.
   *
   * @default false
   */
  translatable: {
    type: Boolean,
    default: false,
  },

  /**
   * Indicates if the field value remains synchronized between all translations of the current data record.
   *
   * @default false
   */
  synced: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  'commit': [value: string | null]
  'update:modelValue': [value: string | null]
}>()

const id = useId()
const placeholder = maybeTranslate(props.options.ui.placeholder)
const runtimeConfig = useRuntimeConfig()
const isPickerVisible = ref(false)

const dir = computed<PruviousIconDir | ''>(() => (props.options.dir ?? '') as PruviousIconDir | '')
const columns = computed(() => clamp(props.options.ui.columns ?? 6, 1, 12))
const background = computed<'light' | 'dark' | 'auto'>(() => props.options.ui.background ?? 'auto')
const backgroundClass = computed(() => `p-icon-bg-${background.value}`)

const sourceDir = computed(() => {
  const dirs = runtimeConfig.public.pruvious.iconsDirs
  const target = isEmpty(dir.value) ? dirs[0] : dirs.find((d) => d.prefix === dir.value)
  return target?.relative ?? ''
})

const previewUrl = computed(() => {
  if (isEmpty(props.modelValue)) {
    return null
  }
  return buildIconUrl(dir.value, props.modelValue!)
})

function clear() {
  emit('update:modelValue', null)
  emit('commit', null)
}
</script>

<style scoped>
.p-icon-preview {
  flex-shrink: 0;
  position: relative;
  width: 6.5rem;
  aspect-ratio: 1;
}

.p-icon-preview-button {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 1rem;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-border));
  border-radius: var(--pui-radius);
  color: hsl(var(--pui-foreground));
  cursor: pointer;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, box-shadow, color;
}

.dark .p-icon-bg-auto .p-icon-preview-button,
.p-icon-bg-dark .p-icon-preview-button {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA/SURBVHgB7dOhEQAgDAPAwGFrmAEGYP+dMB0AVoio6PUSnXuTS1v7PBBxv0wNHcERKDADONgHmE2qp1EElgQ/ufgHd9nZw0oAAAAASUVORK5CYII=');
}

.dark .p-icon-bg-light .p-icon-preview-button,
.p-icon-bg-light .p-icon-preview-button {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
}

.p-icon-preview-button::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: hsl(var(--pui-card) / 0.5);
  opacity: 0;
  transition: var(--pui-transition);
  transition-property: opacity;
}

.p-icon-preview-button:hover:not(:disabled),
.p-icon-preview-button:focus-visible {
  background-color: hsl(var(--pui-card));
  color: hsl(var(--pui-card-foreground));
}

.p-icon-preview-button:hover:not(:disabled)::before,
.p-icon-preview-button:focus-visible::before {
  opacity: 1;
}

.p-icon-preview-button:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.p-icon-preview-button:disabled {
  background-image: none;
  filter: blur(2px);
  opacity: 0.5;
  cursor: not-allowed;
}

.p-icon-preview-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.p-icon-details {
  flex: 1;
  min-width: 0;
  margin-top: auto;
}

.p-icon-details > * + * {
  margin-top: 0.5rem;
}

.p-icon-name {
  display: block;
  max-width: 100%;
}

.p-icon-source {
  display: inline-flex;
  max-width: 100%;
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  color: hsla(var(--pui-muted-foreground));
}
</style>
