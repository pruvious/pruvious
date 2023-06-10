<template></template>

<script setup>
import { _pruviousRequest, fetchPage, onUnmounted, usePruvious, useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const guides = []
const { blocks } = await _pruviousRequest('/blocks', { clientCache: 0, serverCache: 0 })
const pruvious = usePruvious()
const platform = navigator?.userAgentData?.platform || navigator?.platform || 'unknown'
const isMac = /mac/i.test(platform)

let dragging = false
let skipNextScrollTo = false

if (document.hasFocus()) {
  window.parent.postMessage({ action: 'focus' }, '*')
}

window.addEventListener('keydown', onKeyDown)
window.addEventListener('focus', onFocus)
window.addEventListener('blur', onBlur)
document.addEventListener('mouseover', onMouseOver)
document.addEventListener('mouseleave', onMouseLeave)
document.addEventListener('click', onClick, { capture: true })
window.addEventListener('message', onMessage)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('focus', onFocus)
  window.removeEventListener('blur', onBlur)
  document.removeEventListener('mouseover', onMouseOver)
  document.removeEventListener('mouseleave', onMouseLeave)
  document.removeEventListener('click', onClick, { capture: true })
  window.removeEventListener('message', onMessage)
})

function onKeyDown(event) {
  const action = getHotkeyAction(event)

  if (action === 'save') {
    event.preventDefault()
    window.parent.postMessage({ action: 'save' }, '*')
  } else if (action === 'undo') {
    event.preventDefault()
    window.parent.postMessage({ action: 'undo' }, '*')
  } else if (action === 'redo') {
    event.preventDefault()
    window.parent.postMessage({ action: 'redo' }, '*')
  } else if (action === 'paste') {
    event.preventDefault()
    window.parent.postMessage({ action: 'paste' }, '*')
  } else if (action === 'duplicate') {
    event.preventDefault()
    window.parent.postMessage({ action: 'duplicate' }, '*')
  } else if (action === 'copy') {
    event.preventDefault()
    window.parent.postMessage({ action: 'copy' }, '*')
  } else if (action === 'cut') {
    event.preventDefault()
    window.parent.postMessage({ action: 'cut' }, '*')
  } else if (action === 'delete') {
    event.preventDefault()
    window.parent.postMessage({ action: 'delete' }, '*')
  }
}

function onFocus() {
  window.parent.postMessage({ action: 'focus' }, '*')
}

function onBlur() {
  window.parent.postMessage({ action: 'blur' }, '*')
}

function onMouseOver(event) {
  const block = findBlock(event.target)

  unhighlight()

  if (block) {
    highlight(block)
  }
}

function onMouseLeave() {
  unhighlight()
}

function onClick(event) {
  const block = findBlock(event.target)

  if (block) {
    skipNextScrollTo = true
    window.parent.postMessage(
      { action: 'selectBlock', blockId: block.getAttribute('data--pruvious-block-id') },
      '*',
    )
  }

  let target = event.target

  do {
    if (target?.nodeName === 'A') {
      event.preventDefault()
      break
    }

    target = target?.parentElement
  } while (target && target.nodeName !== 'BODY')
}

async function onMessage(event) {
  if (event.data && typeof event.data === 'object') {
    if (event.data.action === 'highlight') {
      document
        .querySelectorAll(
          `:where([data--pruvious-block-id="${event.data.blockId}"]):not(:where([data--pruvious-block-id="${event.data.blockId}"] *))`,
        )
        .forEach((block) => highlight(block))
    } else if (event.data.action === 'unhighlight') {
      unhighlight()
    } else if (event.data.action === 'scrollTo') {
      if (skipNextScrollTo) {
        skipNextScrollTo = false
      } else {
        document
          .querySelector(`[data--pruvious-block-id="${event.data.blockId}"]`)
          ?.scrollIntoView({ behavior: 'smooth' })
      }
    } else if (event.data.action === 'softReload') {
      const page = await fetchPage()
      const top = window.scrollY
      pruvious.value.page = null
      document.body.style.height = `${document.body.offsetHeight}px`

      setTimeout(() => {
        pruvious.value.page = page
        unhighlight()
        setTimeout(() => {
          window.scrollTo({ top, behavior: 'instant' })
          document.body.style.height = null
          setTimeout(() => window.scrollTo({ top, behavior: 'instant' }), 250)
        })
      })
    } else if (event.data.action === 'reload') {
      window.location.reload()
    } else if (event.data.action === 'dragStart') {
      dragging = true
      unhighlight()
    } else if (event.data.action === 'dragEnd') {
      dragging = false
    } else if (event.data.action === 'ping') {
      window.parent.postMessage({ action: 'pong' }, '*')
    }
  }
}

function findBlock(el) {
  let block

  do {
    const blockId = el?.getAttribute('data--pruvious-block-id')

    if (blockId) {
      block = el
      break
    }

    el = el?.parentElement
  } while (el && el.nodeName !== 'BODY')

  return block
}

function highlight(block) {
  if (config.public.pruvious.guides && !dragging) {
    const { guide, guideLabel } = createGuide()
    const rect = block.getBoundingClientRect()
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const blockName = block.getAttribute('data-block-name')

    guide.style.display = 'block'
    guide.style.top = `${Math.round(rect.top + scrollTop)}px`
    guide.style.left = `${Math.round(rect.left + scrollLeft)}px`
    guide.style.width = `${Math.round(rect.width)}px`
    guide.style.height = `${Math.round(rect.height)}px`

    guideLabel.textContent = blocks.find((block) => block.name === blockName)?.label ?? blockName

    guides.push(guide)
  }

  window.parent.postMessage(
    { action: 'highlightBlock', blockId: block.getAttribute('data--pruvious-block-id') },
    '*',
  )
}

function unhighlight() {
  guides.forEach((guide) => guide.remove())
  guides.splice(0, guides.length)
  window.parent.postMessage({ action: 'unhighlightBlock' }, '*')
}

function createGuide() {
  const guide = document.createElement('div')
  const guideLabel = document.createElement('span')

  guide.style.display = 'none'
  guide.style.position = 'absolute'
  guide.style.zIndex = '999999'
  guide.style.overflow = 'hidden'
  guide.style.border = `1px solid ${config.public.pruvious.guides.backgroundColor}`
  guide.style.boxSizing = 'border-box'
  guide.style.pointerEvents = 'none'

  guideLabel.style.display = 'block'
  guideLabel.style.position = 'absolute'
  guideLabel.style.top = '1px'
  guideLabel.style.right = '1px'
  guideLabel.style.maxWidth = '100%'
  guideLabel.style.padding = '3px 4px'
  guideLabel.style.overflow = 'hidden'
  guideLabel.style.textOverflow = 'ellipsis'
  guideLabel.style.whiteSpace = 'nowrap'
  guideLabel.style.background = config.public.pruvious.guides.backgroundColor
  guideLabel.style.boxSizing = 'border-box'
  guideLabel.style.fontFamily = 'Arial'
  guideLabel.style.fontSize = '12px'
  guideLabel.style.lineHeight = '1'
  guideLabel.style.color = config.public.pruvious.guides.textColor

  guide.append(guideLabel)
  document.body.append(guide)

  return { guide, guideLabel }
}

function isEditingText() {
  let el = document.activeElement

  while (el && el.tagName !== 'BODY') {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.hasAttribute('contenteditable')) {
      return true
    }

    el = el.parentElement
  }

  return false
}

function getHotkeyAction(event) {
  const letter = event.key?.toLowerCase() ?? ''

  if (
    !isEditingText() &&
    (((event.key === 'Delete' || event.key === 'Backspace') &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey) ||
      (isMac &&
        letter === 'd' &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey))
  ) {
    return 'delete'
  } else if (isMac && (!event.metaKey || event.altKey || event.ctrlKey)) {
    return null
  } else if (!isMac && (!event.ctrlKey || event.altKey || event.metaKey)) {
    return null
  }

  if (letter === 'y') {
    return event.shiftKey || isEditingText() ? null : 'redo'
  } else if (letter === 'z') {
    if (isEditingText()) {
      return null
    } else {
      return isMac && event.shiftKey ? 'redo' : event.shiftKey ? null : 'undo'
    }
  } else if (letter === 'd') {
    if (!event.shiftKey && !isEditingText()) {
      return 'duplicate'
    }
  } else if (letter === 'c') {
    if (!event.shiftKey && !isEditingText()) {
      return 'copy'
    }
  } else if (letter === 'x') {
    if (!event.shiftKey && !isEditingText()) {
      return 'cut'
    }
  } else if (letter === 'v') {
    if (!event.shiftKey && !isEditingText()) {
      return 'paste'
    }
  } else if (letter === 's') {
    if (!event.shiftKey) {
      return 'save'
    }
  }

  return null
}
</script>

<style>
* {
  scroll-behavior: auto !important;
}
</style>
