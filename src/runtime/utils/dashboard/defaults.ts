import { stopMoving } from '../../composables/dashboard/move'

export const defaultSortableOptions = {
  animation: 0,
  delay: 250,
  delayOnTouchOnly: true,
  direction: 'vertical',
  fallbackOnBody: true,
  invertSwap: true,
  swapThreshold: 0.65,
  onStart: () => {
    document.body.classList.add('is-sorting')
  },
  onEnd: () => {
    document.body.classList.remove('is-sorting')
    stopMoving()
  },
}
