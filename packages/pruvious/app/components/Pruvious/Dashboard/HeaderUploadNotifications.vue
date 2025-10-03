<template>
  <div>
    <PUIButton
      v-if="notifications.length"
      :title="__('pruvious-dashboard', 'Uploads')"
      :variant="widget.isOpen ? 'primary' : 'outline'"
      @click="widget.isOpen = true"
      ref="button"
    >
      <Icon mode="svg" name="tabler:upload" />
      <template v-if="currentUploads" #bubble>
        <PUIBubble>{{ currentUploads }}</PUIBubble>
      </template>
    </PUIButton>
    <PUIDropdown v-if="widget.isOpen" :reference="button?.$el" @close="widget.isOpen = false" ref="dropdown">
      <div class="p-upload-notifications-header">
        <span :title="__('pruvious-dashboard', 'Upload history')" class="pui-truncate">
          {{ __('pruvious-dashboard', 'Upload history') }}
        </span>
        <span v-if="uploadSpeed" :title="__('pruvious-dashboard', 'Upload speed')">
          {{ format(uploadSpeed, { unitSeparator: ' ' }) }}/s
        </span>
      </div>

      <div v-for="notification of notifications" class="p-upload-notification">
        <button
          v-if="notification.status === 'completed'"
          :aria-label="__('pruvious-dashboard', 'View')"
          type="button"
          class="p-upload-notification-button"
        ></button>

        <span
          :title="
            notification.status === 'completed'
              ? __('pruvious-dashboard', 'Completed')
              : notification.status === 'failed'
                ? __('pruvious-dashboard', 'Failed')
                : notification.status === 'aborted'
                  ? __('pruvious-dashboard', 'Aborted')
                  : notification.status === 'pending'
                    ? __('pruvious-dashboard', 'Pending')
                    : notification.status === 'uploading'
                      ? __('pruvious-dashboard', 'Uploading')
                      : ''
          "
          class="p-upload-notification-status"
          :class="`p-upload-notification-status-${notification.status}`"
        >
          <Icon v-if="notification.status === 'completed'" mode="svg" name="tabler:check" />
          <Icon v-else-if="notification.status === 'failed'" mode="svg" name="tabler:alert-triangle" />
          <Icon v-else-if="notification.status === 'aborted'" mode="svg" name="tabler:circle-off" />
          <Icon v-else-if="notification.status === 'pending'" mode="svg" name="tabler:clock" />
          <PruviousDashboardProgressCircle
            v-else-if="notification.status === 'uploading'"
            :progress="notification.progress * 100"
          />
        </span>

        <div class="p-upload-notification-content">
          <span class="p-upload-notification-filename">
            <span class="pui-truncate">
              {{
                notification.fileName.includes('.')
                  ? notification.fileName.slice(0, notification.fileName.lastIndexOf('.'))
                  : notification.fileName
              }}
            </span>
            <span v-if="notification.fileName.includes('.')">
              {{ notification.fileName.slice(notification.fileName.lastIndexOf('.')) }}
            </span>
          </span>
          <span v-if="notification.status === 'failed'" class="p-upload-notification-detail">
            {{ notification.error ?? __('pruvious-dashboard', 'Failed') }}
          </span>
          <span v-else-if="notification.status === 'aborted'" class="p-upload-notification-detail">
            {{ __('pruvious-dashboard', 'Aborted') }}
          </span>
          <span v-else class="p-upload-notification-detail">
            {{ format(notification.size, { unitSeparator: ' ' }) }}
          </span>
        </div>

        <button
          v-if="notification.status === 'uploading'"
          :title="__('pruvious-dashboard', 'Abort')"
          @click="notification.abort()"
          type="button"
          class="p-upload-notification-action-button"
        >
          <Icon mode="svg" name="tabler:circle-off" />
        </button>
        <button
          v-else
          :title="__('pruvious-dashboard', 'Hide')"
          @click="
            () => {
              if (notifications.length === 1) {
                widget.isOpen = false
              }
              notifications = notifications.filter(({ id }) => id !== notification.id)
              dropdown?.update()
            }
          "
          type="button"
          class="p-upload-notification-action-button p-upload-notification-action-button-hide"
        >
          <Icon mode="svg" name="tabler:x" />
        </button>
      </div>
    </PUIDropdown>
  </div>
</template>

<script lang="ts" setup>
import {
  __,
  usePruviousDashboardUploadNotifications,
  usePruviousDashboardUploadNotificationsWidget,
  useUploadSpeed,
} from '#pruvious/client'
import { format } from 'bytes'

const button = useTemplateRef('button')
const dropdown = useTemplateRef('dropdown')
const notifications = usePruviousDashboardUploadNotifications()
const widget = usePruviousDashboardUploadNotificationsWidget()
const uploadSpeed = useUploadSpeed()
const currentUploads = computed(
  () => notifications.value.filter(({ status }) => status === 'uploading' || status === 'pending').length,
)
</script>

<style scoped>
.p-upload-notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  color: hsl(var(--pui-muted));
  font-size: 0.75rem;
  font-weight: 500;
}

.p-upload-notification {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
}

.p-upload-notification-button {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border-radius: calc(var(--pui-radius) - 0.25rem);
  transition-property: background-color;
  transition: var(--pui-transition);
}

.p-upload-notification:hover .p-upload-notification-button,
.p-upload-notification:focus .p-upload-notification-button {
  background-color: hsl(var(--pui-accent) / 0.08);
}

.p-upload-notification-button ~ * {
  cursor: pointer;
}

.p-upload-notification-status {
  flex-shrink: 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid transparent;
  border-radius: 50%;
  font-size: 1rem;
  transition: var(--pui-transition);
  transition-property: background-color, border-color, color;
}

.p-upload-notification-status-completed {
  background-color: hsl(var(--pui-accent) / 0.16);
}

.p-upload-notification-status-failed,
.p-upload-notification-status-aborted {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

.p-upload-notification-status-pending {
  border-color: hsl(var(--pui-accent) / 0.24);
}

.p-upload-notification-status-uploading {
  border: none;
}

.p-upload-notification-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.p-upload-notification-filename {
  display: flex;
  font-size: 0.8125rem;
  font-weight: 500;
  overflow: hidden;
}

.p-upload-notification-filename > :nth-child(2) {
  flex-shrink: 0;
}

.p-upload-notification-detail {
  display: block;
  font-size: 0.75rem;
  color: hsl(var(--pui-muted));
}

.p-upload-notification-action-button {
  flex-shrink: 0;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-left: auto;
  background-color: hsl(var(--pui-accent) / 0.16);
  border-radius: 50%;
  transition: var(--pui-transition);
  transition-property: background-color, color;
}

.p-upload-notification-action-button-hide {
  display: none;
}

.p-upload-notification:hover .p-upload-notification-action-button,
.p-upload-notification:focus-within .p-upload-notification-action-button {
  display: flex;
}

.p-upload-notification-action-button:hover,
.p-upload-notification-action-button:focus {
  background-color: hsl(var(--pui-destructive));
  color: hsl(var(--pui-destructive-foreground));
}

:deep(.pui-dropdown) {
  width: 18rem;
}
</style>
