<template>
  <Toaster
    :gap="8"
    :toastOptions="{
      class: 'pui-toast',
      unstyled: true,
      classes: { actionButton: 'pui-button pui-button-primary pui-raw' },
    }"
    :visibleToasts="3"
    expand
    offset="0.5rem"
    position="top-center"
    class="pui-toaster"
    style="--width: 336px"
  >
    <template #success-icon>
      <Icon mode="svg" name="tabler:circle-check" size="1.5em" />
    </template>
    <template #error-icon>
      <Icon mode="svg" name="tabler:exclamation-circle-filled" size="1.5em" />
    </template>
    <template #info-icon>
      <Icon mode="svg" name="tabler:info-circle" size="1.5em" />
    </template>
    <template #warning-icon>
      <Icon mode="svg" name="tabler:exclamation-circle" size="1.5em" />
    </template>
  </Toaster>
</template>

<script lang="ts" setup>
import { isEmpty } from '@pruvious/utils'
import { Toaster } from 'vue-sonner'
import { puiToast, usePUIToasterQueue } from '../pui/toast'

const route = useRoute()
const toasterQueue = usePUIToasterQueue()

let initialized = false

onMounted(() => {
  watch(
    toasterQueue,
    () => {
      if (!isEmpty(toasterQueue.value)) {
        let displayed = 0

        for (const { message, options } of toasterQueue.value) {
          if (!options?.showAfterRouteChange) {
            setTimeout(() => puiToast(message, options))
            displayed++
          }
        }

        if (displayed) {
          toasterQueue.value = toasterQueue.value.filter(({ options }) => options?.showAfterRouteChange)
        }

        initialized = true
      }
    },
    { immediate: true },
  )
})

watch(
  () => route.path,
  () => {
    if (!isEmpty(toasterQueue.value)) {
      for (const { message, options } of toasterQueue.value) {
        setTimeout(() => puiToast(message, options))
      }

      toasterQueue.value = []
      initialized = true
    }
  },
  { immediate: true },
)
</script>

<style>
.pui-toaster {
  top: calc(0.5rem - 0.5px);
  z-index: 99998;
}

.pui-toast {
  --pui-size: var(--pui-toast-size);
  --pui-background: var(--pui-accent);
  --pui-foreground: var(--pui-accent-foreground);
  display: flex;
  gap: 0.5em;
  width: 100%;
  background-color: hsl(var(--pui-accent));
  border-radius: var(--pui-radius);
  padding: calc(0.75em - 0.0625rem);
  padding: round(calc(0.75em - 0.0625rem), 1px);
  color: hsl(var(--pui-accent-foreground));
  font-size: calc(1rem + var(--pui-toast-size) * 0.125rem);
}

.pui-toast:focus-visible {
  box-shadow: none;
  border-color: hsl(var(--pui-primary));
}

.pui-toast-action:not(.pui-toast-description) {
  align-items: center;
}

.pui-toast-error,
.pui-toast[data-type='error'],
.pui-toast[data-type='warning'] {
  --pui-background: var(--pui-destructive);
  --pui-foreground: var(--pui-destructive-foreground);
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.pui-toast pre {
  background-color: hsl(var(--pui-primary));
  color: hsl(var(--pui-primary-foreground));
}

.pui-toast :not(pre) > code {
  background-color: hsl(var(--pui-primary-foreground));
  color: hsl(var(--pui-primary));
}

.pui-toast-error :not(pre) > code,
.pui-toast[data-type='error'] :not(pre) > code,
.pui-toast[data-type='warning'] :not(pre) > code {
  background-color: rgba(0, 0, 0, 0.2);
  color: hsl(var(--pui-destructive-foreground));
}

.dark .pui-toast pre,
.dark .pui-toast :not(pre) > code {
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--pui-foreground);
}

.pui-toast [data-icon] {
  flex-shrink: 0;
  display: block;
  width: auto;
  height: auto;
  margin: 0;
}

.pui-toast [data-icon] svg {
  margin: 0;
}

.pui-toast [data-content] {
  flex: 1;
}

.pui-toast [data-title] {
  font-weight: 600;
}

.pui-toast [data-title]:not(:last-child) {
  margin-bottom: 0.125em;
}

.pui-toast [data-description] {
  flex: 1;
  font-size: calc(1em - 0.0625rem);
}

.pui-toast [data-button] {
  margin-top: auto;
  padding: 0 0.75em;
  padding: 0 round(0.75em, 1px);
  font-size: calc(1em - 0.0625rem);
}

.pui-toast [data-close-button] {
  width: 1.5em;
  height: 1.5em;
  background-color: hsl(var(--pui-primary)) !important;
  border: none;
  color: hsl(var(--pui-primary-foreground)) !important;
  transition: var(--pui-transition);
  transition-property: background-color, box-shadow, color;
}

.pui-toast [data-close-button] svg {
  width: 1em;
  height: 1em;
}

.pui-toast [data-close-button]:focus-visible {
  box-shadow:
    0 0 0 0.125rem hsl(var(--pui-background)),
    0 0 0 0.25rem hsl(var(--pui-ring)),
    0 0 #0000;
  outline: 0.125rem solid transparent;
  outline-offset: 0.125rem;
}

@media (max-width: 1024px) {
  .pui-toaster {
    top: calc(0.375rem - 0.5px) !important;
  }
}

@media (max-width: 600px) {
  .pui-toaster {
    --mobile-offset: 0.3125rem;
  }
}
</style>
