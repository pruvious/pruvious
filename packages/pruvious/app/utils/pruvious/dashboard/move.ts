export const usePruviousDashboardDragImageLabel: () => Ref<string> = () =>
  useState('pruvious-dashboard-drag-image-label', () => '')

export const usePruviousDashboardIsMoving: () => Ref<boolean> = () =>
  useState('pruvious-dashboard-is-moving', () => false)

export function startMoving(dragImageLabel: string | number) {
  usePruviousDashboardDragImageLabel().value = String(dragImageLabel)
  usePruviousDashboardIsMoving().value = true
}

export function stopMoving() {
  usePruviousDashboardDragImageLabel().value = ''
  usePruviousDashboardIsMoving().value = false
}
