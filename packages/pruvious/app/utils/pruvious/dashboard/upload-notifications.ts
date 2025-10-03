export interface DashboardNotification {
  /**
   * A unique identifier for the notification.
   */
  id: string

  /**
   * The complete name of the file to upload, including its extension.
   */
  fileName: string

  /**
   * The target directory path where the file will be uploaded.
   */
  directory: string

  /**
   * The size of the file to upload, in bytes.
   */
  size: number

  /**
   * The current status of the upload.
   */
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'aborted'

  /**
   * The current upload progress.
   *
   * - Value ranges from 0 to 1 (0% to 100%).
   * - Updates automatically during upload.
   */
  progress: number

  /**
   * Aborts the upload.
   */
  abort: () => void

  /**
   * The error message if the upload failed.
   */
  error?: string
}

export interface DashboardNotificationUploadWidget {
  /**
   * Controls if the notification widget is open or closed.
   */
  isOpen: boolean
}

/**
 * Composable containing dashboard upload notifications.
 */
export const usePruviousDashboardUploadNotifications = () =>
  useState<DashboardNotification[]>('pruvious-dashboard-upload-notifications', () => [])

/**
 * Composable containing the state of the upload notifications widget.
 */
export const usePruviousDashboardUploadNotificationsWidget = () =>
  useState<DashboardNotificationUploadWidget>('pruvious-dashboard-upload-notifications-widget', () => ({
    isVisible: false,
    isOpen: false,
  }))
