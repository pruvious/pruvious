<template>
  <Teleport to="body">
    <div
      v-if="visible && highlightedBlock && !isMoving"
      class="rect"
      :style="{
        top: highlightedBlock.top + 'px',
        left: highlightedBlock.left + 'px',
        width: highlightedBlock.width + 'px',
        height: highlightedBlock.height + 'px',
      }"
    >
      <span class="label">{{ __('pruvious-dashboard', blockLabels[highlightedBlock.name] as any) }}</span>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, useRoute } from '#imports'
import { useEventListener } from '@vueuse/core'
import { debounce } from 'perfect-debounce'
import { getHotkeyAction } from '../../composables/dashboard/hotkeys'
import { usePage } from '../../composables/page'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'
import { isArray } from '../../utils/array'
import { pruviousFetch } from '../../utils/fetch'
import { isKeyOf, isObject } from '../../utils/object'

const page = usePage()
const route = useRoute()

const blockLabels = ref<Record<string, string>>({})
const highlightedBlock = ref<{
  key: string
  name: string
  top: number
  left: number
  width: number
  height: number
} | null>(null)
const isMoving = ref(false)
const visible = ref(false)

await loadTranslatableStrings('pruvious-dashboard')

if (process.client) {
  visible.value = window.top !== window.self

  if (visible.value) {
    useEventListener(window, 'message', async (event) => {
      if (event.origin === window.location.origin) {
        switch (event.data.type) {
          case 'pruvious:reload':
            reload()
            break
          case 'pruvious:blockLabels':
            blockLabels.value = event.data.data
            break
          case 'pruvious:highlightBlock':
            const el = document.querySelector(`[data-pruvious-block-key="${event.data.data}"]`) as HTMLElement

            if (el) {
              highlightBlock(el)
            } else {
              highlightedBlock.value = null
            }
            break
          case 'pruvious:unhighlightBlock':
            highlightedBlock.value = null
            break
          case 'pruvious:scrollToBlock':
            const el2 = document.querySelector(`[data-pruvious-block-key="${event.data.data}"]`) as HTMLElement | null

            el2?.scrollIntoView({
              behavior: 'smooth',
              block: el2.offsetHeight > window.innerHeight ? 'start' : 'center',
            })
            break
          case 'pruvious:isMoving':
            isMoving.value = event.data.data
            break
        }
      }
    })

    useEventListener(
      document,
      'click',
      (event) => {
        const block = bubbleBlock(event.target as HTMLElement)

        if (block) {
          messageParent('selectBlock', block.dataset.pruviousBlockKey)
        } else {
          messageParent('selectBlock', null)
        }

        let target = event.target as HTMLElement | null

        do {
          if (target?.nodeName === 'A' && target?.getAttribute('target') !== '_blank') {
            event.preventDefault()
            break
          }

          target = target?.parentElement ?? null
        } while (target && target.nodeName !== 'BODY')
      },
      { capture: true },
    )

    useEventListener(document, 'mouseover', (event: MouseEvent) => {
      const block = bubbleBlock(event.target as HTMLElement)

      if (block) {
        highlightBlock(block)
      } else {
        highlightedBlock.value = null
      }
    })

    useEventListener(document, 'mouseleave', () => {
      highlightedBlock.value = null
    })

    useEventListener(window, 'focus', () => messageParent('focus'))
    useEventListener(window, 'blur', () => messageParent('blur'))

    useEventListener('keydown', (event) => {
      const action = getHotkeyAction(event)

      if (action) {
        if (action === 'save') {
          messageParent('save')
        } else if (action === 'undo') {
          messageParent('undo')
        } else if (action === 'redo') {
          messageParent('redo')
        } else if (action === 'copy') {
          messageParent('copy')
        } else if (action === 'cut') {
          messageParent('cut')
        } else if (action === 'paste') {
          messageParent('paste')
        } else if (action === 'delete') {
          messageParent('delete')
        } else if (action === 'duplicate') {
          messageParent('duplicate')
        } else if (action === 'moveUp') {
          messageParent('moveUp')
        } else if (action === 'moveDown') {
          messageParent('moveDown')
        }

        event.preventDefault()
        event.stopPropagation()
      }
    })

    messageParent('ready')
  }
}

function messageParent(type: string, data?: any) {
  if (window.top !== window.self) {
    window.top?.postMessage({ type: `pruvious:${type}`, data }, window.location.origin)
  }
}

function highlightBlock(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft
  const scrollTop = window.scrollY || document.documentElement.scrollTop

  highlightedBlock.value = {
    key: el.dataset.pruviousBlockKey!,
    name: el.dataset.pruviousBlockName!,
    top: Math.round(rect.top + scrollTop),
    left: Math.round(rect.left + scrollLeft),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function bubbleBlock(el: HTMLElement | null): HTMLElement | null {
  let block: HTMLElement | null = null

  do {
    const key = el?.hasAttribute('data-pruvious-block-key')

    if (key) {
      block = el
      break
    }

    el = el?.parentElement ?? null
  } while (el && el.nodeName !== 'BODY')

  return block
}

const reload = debounce(async () => {
  const response = await pruviousFetch('previews.get', { subpath: route.fullPath })

  if (response.success) {
    const top = window.scrollY
    mergePageProps(response.data)
    highlightedBlock.value = null

    for (let i = 0; i < 25; i++) {
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          window.scrollTo({ top, behavior: 'instant' })
          setTimeout(resolve)
        }),
      )

      if (window.scrollY === top) {
        break
      }
    }
  }
}, 25)

function mergePageProps(source: Record<string, any>, target?: Record<string, any>) {
  target ??= page.value!

  for (const key in source) {
    if (isKeyOf(target, key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        mergePageProps(source[key], target[key])
      } else if (isArray(source[key]) && isArray(target[key])) {
        target[key].splice(source[key].length)

        for (const [i, item] of source[key].entries()) {
          if (isObject(item) && isObject(target[key][i])) {
            mergePageProps(item, target[key][i])
          } else if (item !== target[key][i]) {
            target[key][i] = item
          }
        }
      } else if (source[key] !== target[key]) {
        target[key] = source[key]
      }
    } else {
      target[key] = source[key]
    }
  }

  for (const key in target) {
    if (!source.hasOwnProperty(key)) {
      delete target[key]
    }
  }

  return target
}
</script>

<style scoped>
.rect {
  position: absolute;
  top: 0;
  z-index: 999999;
  overflow: hidden;
  border: 1px solid var(--pruvious-preview-color, rgba(6, 82, 221, 0.75));
  box-sizing: border-box;
  pointer-events: none;
}

.label {
  display: block;
  position: absolute;
  top: 1px;
  right: 1px;
  max-width: 100%;
  padding: 3px 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--pruvious-preview-color, rgba(6, 82, 221, 0.75));
  box-sizing: border-box;
  font-family: Arial;
  font-size: 12px;
  line-height: 1;
  color: var(--pruvious-preview-text-color, white);
}
</style>
