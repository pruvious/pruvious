export const useDragImageLabel: () => Ref<string> = () => useState('pruvious-dashboard-drag-image-label', () => '')

export const useIsMoving: () => Ref<boolean> = () => useState('pruvious-dashboard-is-moving', () => false)

export function startMoving(dragImageLabel: string | number) {
  useDragImageLabel().value = String(dragImageLabel)
  useIsMoving().value = true
}

export function stopMoving() {
  useDragImageLabel().value = ''
  useIsMoving().value = false
}
