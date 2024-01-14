import { defineNuxtPlugin } from '#imports'
import DOMPurify from 'dompurify'
import tippy, { type Instance, type Props } from 'tippy.js'
import type { Directive, DirectiveBinding } from 'vue'
import { __ } from '../composables/translatable-strings'
import { isArray } from '../utils/array'
import { isObject } from '../utils/object'
import { isString } from '../utils/string'

type CustomElement = HTMLElement & { _pruviousTooltip?: Instance; _pruviousTooltipSettings?: string }
type TooltipDirective = Directive<CustomElement, Partial<Props> | string>

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('pruvious-tooltip', <TooltipDirective>{
    mounted: (el, binding: DirectiveBinding<Partial<Props> | string>) => {
      initTooltip(el, binding)
    },
    updated: (el, binding) => {
      if (JSON.stringify(binding.value) !== el._pruviousTooltipSettings) {
        destroyTooltip(el)
        initTooltip(
          el,
          binding,
          !!binding.modifiers['show-on-update'] || (isObject(binding.value) && binding.value.showOnCreate),
          !!binding.modifiers['highlight-apostrophes'],
        )
      }
    },
    beforeUnmount: (el) => {
      destroyTooltip(el)
    },
  })
})

function initTooltip(
  el: CustomElement,
  binding: DirectiveBinding<Partial<Props> | string>,
  showOnCreate = false,
  highlightApostrophes = false,
) {
  let content = DOMPurify.sanitize(
    __(
      'pruvious-dashboard',
      (isString(binding.value)
        ? binding.value
        : isArray(binding.value)
        ? binding.value.join('<br>')
        : isObject(binding.value) && isString(binding.value.content)
        ? binding.value.content
        : '') as any,
    ),
  )
    .replace(/\*\*([^*]*(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong class="text-primary-200">$1</strong>')
    .replace(/\!\!([^!]*(?:\!(?!\!)[^!]*)*)\!\!/g, '<strong class="text-amber-400">$1</strong>')
    .replace(
      /\(\((.*?)\)\)/g,
      '<strong class="inline-block h-5 min-w-5 rounded-full bg-gray-500 ml-1 px-1.5 text-center text-xs leading-5 text-white">$1</strong>',
    )
    .replace(
      /(.*?)\[\[(.*?)\]\](?:\<br\>)?/g,
      '<span class="flex justify-between gap-6 mb-1 last:mb-0"><span>$1</span><strong class="font-mono text-gray-200 text-xs">$2</strong></span>',
    )

  if (highlightApostrophes) {
    content = content.replace(/'(.*?)'/g, '<strong class="text-primary-200">$1</strong>')
  }

  if (binding.modifiers['highlight-apostrophes']) {
    content = content.replace(/'(.*?)'/g, '<strong class="text-primary-200">$1</strong>')
  }

  if (content) {
    el._pruviousTooltip = tippy(el, {
      allowHTML: true,
      animation: false,
      arrow: true,
      hideOnClick: true,
      maxWidth: 320,
      offset: [0, 10],
      placement: 'top',
      showOnCreate,
      zIndex: 99999,
      ...(isObject(binding.value) ? binding.value : {}),
      content,
    })

    el._pruviousTooltipSettings = JSON.stringify(binding.value)
  }
}

function destroyTooltip(el: CustomElement) {
  el._pruviousTooltip?.destroy()
  delete el._pruviousTooltip
  delete el._pruviousTooltipSettings
}
