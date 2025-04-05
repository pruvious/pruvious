<template>
  <PUIPopup
    v-if="dialog"
    :additionalClasses="['pui-dialog']"
    :width="dialog.width"
    @close="
      (close) => {
        dialog?.dismiss()
        close().then(() => (dialog = null))
      }
    "
    ref="popup"
  >
    <div v-if="dialog.content" v-html="dialog.content" class="pui-dialog-content pui-prose"></div>
    <div class="pui-dialog-actions">
      <PUIButton
        v-for="{ label, variant, resolve } in dialog.actions"
        :variant="variant"
        @click="
          () => {
            resolve()
            popup?.close().then(() => (dialog = null))
          }
        "
      >
        {{ label }}
      </PUIButton>
    </div>
  </PUIPopup>
</template>

<script lang="ts" setup>
import { usePUIDialog } from '../pui/dialog'

const dialog = usePUIDialog()
const popup = useTemplateRef('popup')
</script>

<style>
.pui-dialog {
  --pui-size: var(--pui-dialog-size);
}

.pui-dialog-content {
  margin-bottom: 1em;
  font-weight: 500;
}

.pui-dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
