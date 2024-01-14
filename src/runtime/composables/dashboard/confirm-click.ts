import { useState, type Ref } from '#imports'
import { pruviousUnique } from '../unique'

interface ClickConfirmation {
  target: Element
  id?: string
  success?: (event?: MouseEvent) => any | Promise<any>
  fail?: (event?: MouseEvent) => any | Promise<any>
}

export const useClickConfirmation: () => Ref<ClickConfirmation | undefined> = () =>
  useState('pruvious-click-confirmation', () => undefined)

/**
 * Call a `success` callback if the user clicks on the `target` element twice.
 * Otherwise, call a `fail` callback.
 * The mouse cursor must be over the `target` element when the second click occurs and cannot leave the element.
 */
export async function confirmClick(options: ClickConfirmation) {
  const clickConfirmation = useClickConfirmation()
  const id = options.id ?? pruviousUnique('confirm')

  if (clickConfirmation.value?.id === id) {
    await clickConfirmation.value.success?.()
    clickConfirmation.value = undefined
  } else {
    clickConfirmation.value = { ...options, id }

    options.target.addEventListener(
      'mouseleave',
      async () => {
        if (clickConfirmation.value?.id === id) {
          await clickConfirmation.value.fail?.()
          clickConfirmation.value = undefined
        }
      },
      { once: true },
    )
  }
}
