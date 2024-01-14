import { useState, type Ref } from '#imports'

export const useDragImageLabel: () => Ref<string> = () => useState('pruvious-drag-image-label', () => '')

export const useIsMoving: () => Ref<boolean> = () => useState('pruvious-is-moving', () => false)

export function startMoving(options: { dragImageLabel: string }) {
  useDragImageLabel().value = options.dragImageLabel
  useIsMoving().value = true
}

export function stopMoving() {
  useDragImageLabel().value = ''
  useIsMoving().value = false
}
