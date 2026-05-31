<template>
  <PUIField v-if="!options.ui.hidden">
    <PruviousFieldLabel :id="id" :name="name" :options="options" :synced="synced" :translatable="translatable" />

    <div v-if="!sections.length" class="pui-muted">
      {{ __('pruvious-dashboard', 'No colors configured') }}
    </div>

    <div v-else class="p-color-sections">
      <input :id="id" @focus="focusFirstSwatch" readonly tabindex="-1" type="text" class="p-color-focus-trap" />

      <div v-for="(section, sectionIndex) in sections" :key="sectionIndex" class="p-color-section">
        <div v-if="section.label" :id="`${id}-section-${sectionIndex}`" class="p-color-section-label">
          {{ section.label }}
        </div>
        <div
          :aria-labelledby="section.label ? `${id}-section-${sectionIndex}` : undefined"
          role="group"
          class="p-color-swatches"
        >
          <button
            v-for="choice in section.colors"
            v-pui-tooltip="choice.label ? `${choice.label} (${choice.value})` : choice.value"
            :aria-label="choice.label ?? choice.value"
            :aria-pressed="modelValue === choice.value"
            :disabled="disabled"
            :key="choice.value"
            @click="select(choice.value)"
            ref="swatchRefs"
            type="button"
            :class="[
              'p-color-swatch pui-raw',
              {
                'p-color-swatch-selected': modelValue === choice.value,
                'p-color-swatch-checker': hasAlphaChannel(choice.value),
              },
            ]"
          >
            <span class="p-color-swatch-fill" :style="{ 'background-color': choice.value }"></span>
          </button>

          <PUIButton
            v-if="sectionIndex === sections.length - 1 && !isNull(modelValue)"
            v-pui-tooltip="__('pruvious-dashboard', 'Clear selection')"
            :disabled="disabled"
            :size="-1"
            @click="clear"
            variant="outline"
          >
            <NuxtIcon mode="svg" name="tabler:x" />
          </PUIButton>
        </div>
      </div>
    </div>

    <input :name="path" :value="modelValue ?? ''" hidden />

    <PruviousFieldMessage :error="error" :name="name" :options="options" />
  </PUIField>
</template>

<script lang="ts" setup>
import { Icon as NuxtIcon } from '#components'
import { __ } from '#pruvious/app'
import { maybeTranslate } from '#pruvious/dashboard'
import type { SerializableFieldOptions } from '#pruvious/server'
import { hasAlphaChannel, isNull, isString } from '@pruvious/utils'

interface DisplayChoice {
  label: string | undefined
  value: string
}

interface DisplaySection {
  label: string | undefined
  colors: DisplayChoice[]
}

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
    type: Object as PropType<SerializableFieldOptions<'nullableColor'>>,
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
const swatchRefs = ref<HTMLButtonElement[]>([])

function focusFirstSwatch() {
  swatchRefs.value[0]?.focus()
}

const sections = computed<DisplaySection[]>(() => {
  const ungrouped: DisplayChoice[] = []
  const grouped: DisplaySection[] = []

  for (const entry of props.options.colors) {
    if (isString(entry)) {
      ungrouped.push({ label: undefined, value: entry })
    } else if ('colors' in entry) {
      grouped.push({
        label: maybeTranslate(entry.group),
        colors: entry.colors.map((c) =>
          isString(c)
            ? { label: undefined, value: c }
            : { label: c.label ? maybeTranslate(c.label) : undefined, value: c.value },
        ),
      })
    } else {
      ungrouped.push({
        label: entry.label ? maybeTranslate(entry.label) : undefined,
        value: entry.value,
      })
    }
  }

  return ungrouped.length ? [{ label: undefined, colors: ungrouped }, ...grouped] : grouped
})

function select(value: string) {
  if (props.disabled || props.modelValue === value) {
    return
  }
  emit('update:modelValue', value)
  emit('commit', value)
}

function clear() {
  if (props.disabled || isNull(props.modelValue)) {
    return
  }
  emit('update:modelValue', null)
  emit('commit', null)
}
</script>

<style scoped>
.p-color-sections {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.p-color-focus-trap {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  pointer-events: none;
}

.p-color-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.p-color-section-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: hsl(var(--pui-muted-foreground));
}

.p-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.p-color-swatch {
  position: relative;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  overflow: hidden;
  background-color: hsl(var(--pui-background));
  border: 1px solid hsl(var(--pui-input));
  border-radius: calc(var(--pui-radius) - 0.125rem);
  cursor: pointer;
  transition: var(--pui-transition);
  transition-property: border-color, border-radius, border-width, box-shadow;
}

.p-color-swatch-checker {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAA5SURBVHgB7dGxEQAgDELRxDHYfzVYIzoChYXnQf3vNTTJKWMAnKxWXV7AgC+APWdOKMnJckrAP8ENTFgK0Z64q28AAAAASUVORK5CYII=');
}

.p-color-swatch:hover:not(:disabled) {
  border-color: hsl(var(--pui-foreground));
}

.p-color-swatch:hover:not(:disabled):not(.p-color-swatch-selected) .p-color-swatch-fill {
  inset: 2px;
  border-radius: calc(var(--pui-radius) - 0.3125rem);
}

.p-color-swatch:focus,
.p-color-swatch:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

.p-color-swatch-selected {
  border: 2px solid hsl(var(--pui-primary));
  border-radius: 50%;
}

.p-color-swatch.p-color-swatch-selected:focus,
.p-color-swatch.p-color-swatch-selected:focus-visible {
  border-color: transparent;
}

.p-color-swatch-selected .p-color-swatch-fill {
  inset: 2px;
  border-radius: 50%;
}

.p-color-swatch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.p-color-swatch-fill {
  position: absolute;
  inset: 0;
  transition: var(--pui-transition);
  transition-property: top, right, bottom, left, border-radius;
}
</style>
