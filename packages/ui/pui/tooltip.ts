import { isArray, isObject, isString } from '@pruvious/utils'
import tippy, { type Instance, type Props } from 'tippy.js'
import type { Directive, DirectiveBinding } from 'vue'
import { puiMarkdown, puiSanitize } from './html'

declare module 'vue' {
  interface ComponentCustomProperties {
    /**
     * The `v-pui-tooltip` directive allows you to add a tooltip to an element.
     * You can provide a string or a Tippy.js `Props` object as the directive value.
     *
     * The following modifiers are available:
     *
     * - `destructive` - Applies a destructive theme styling to the tooltip.
     *                   This is typically used for warning or error messages.
     * - `nomd`        - Prevents Markdown parsing of the tooltip content.
     *                   When `true`, content is displayed as plain text.
     * - `row`         - Controls whether tooltip content is wrapped in a `.pui-row` container.
     *                   Row container enables horizontal spacing between elements.
     * - `watch`       - Prevents tooltip from closing when clicked.
     *                   Overrides the Tippy.js `hideOnClick` behavior to keep the tooltip visible.
     *
     * @see https://atomiks.github.io/tippyjs/v6/all-props/
     */
    vPuiTooltip: PUITooltipDirective
  }
}

type CustomElement = HTMLElement & { _puiTooltip?: Instance; _puiTooltipValue?: string }
type PUITooltipDirectiveModifiers = 'destructive' | 'nomd' | 'row' | 'watch'
type PUITooltipDirective = Directive<CustomElement, Partial<Props> | string | undefined>

let initialized = false

export function puiTooltipInit() {
  if (!initialized) {
    useNuxtApp().vueApp.directive('pui-tooltip', <PUITooltipDirective>{
      mounted: (el, binding: DirectiveBinding<Partial<Props> | string | undefined, PUITooltipDirectiveModifiers>) => {
        initTooltip(el, binding)
      },
      updated: (el, binding) => {
        if (JSON.stringify(binding.value) !== el._puiTooltipValue) {
          if (el._puiTooltip) {
            const tippyProps = prepareProps(binding)
            if (tippyProps) {
              el._puiTooltip.setProps(tippyProps)
              el._puiTooltipValue = JSON.stringify(binding.value)
            }
          } else {
            initTooltip(el, binding)
          }
        }
      },
      beforeUnmount: (el) => {
        destroyTooltip(el)
      },
    })
  }
  initialized = true
}

function prepareProps(
  binding: DirectiveBinding<Partial<Props> | string | undefined, PUITooltipDirectiveModifiers>,
): Partial<Props> | null {
  const contentRaw = (
    isString(binding.value)
      ? binding.value
      : isArray(binding.value)
        ? binding.value.join('<br>')
        : isObject(binding.value) && isString(binding.value.content)
          ? binding.value.content
          : ''
  ) as any

  const markdown = !binding.modifiers.nomd
  let content = markdown ? puiMarkdown(contentRaw) : puiSanitize(contentRaw)

  if (content) {
    if (binding.modifiers.row) {
      content = `<div class="pui-row">${content}</div>`
    }

    const tippyProps: Partial<Props> = {
      allowHTML: true,
      animation: false,
      arrow: true,
      hideOnClick: true,
      maxWidth: 320,
      offset: [0, 10],
      placement: 'top',
      zIndex: 99999,
      ...(isObject(binding.value) ? binding.value : undefined),
      content,
    }

    if (binding.modifiers.watch) {
      tippyProps.hideOnClick = false
    }

    if (binding.modifiers.destructive) {
      tippyProps.theme = 'destructive'
    } else if (isObject(binding.value) && binding.value.theme) {
      tippyProps.theme = binding.value.theme
    }

    return tippyProps
  }

  return null
}

function initTooltip(
  el: CustomElement,
  binding: DirectiveBinding<Partial<Props> | string | undefined, PUITooltipDirectiveModifiers>,
) {
  const tippyProps = prepareProps(binding)
  if (tippyProps) {
    el._puiTooltip = tippy(el, tippyProps)
    el._puiTooltipValue = JSON.stringify(binding.value)
  }
}

function destroyTooltip(el: CustomElement) {
  el._puiTooltip?.destroy()
  delete el._puiTooltip
  delete el._puiTooltipValue
}
