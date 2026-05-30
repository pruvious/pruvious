<template>
  <span v-if="!isEmpty(finalSvg)" v-html="finalSvg" class="pruvious-icon" />
</template>

<script lang="ts" setup>
import { buildIconUrl } from '#pruvious/app'
import { isEmpty, isFunction, isNull, isString, isUndefined } from '@pruvious/utils'
import { normalizeClass, normalizeStyle, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  /**
   * Icon basename (without `.svg` extension), as stored by `iconField`.
   */
  name: {
    type: String as PropType<string | null>,
    default: null,
  },

  /**
   * Icon directory basename. Defaults to the first directory configured via
   * `pruvious.dir.icons`.
   */
  dir: {
    type: String as PropType<string | null>,
    default: null,
  },
})

const attrs = useAttrs()

const url = computed(() => (isString(props.name) && !isEmpty(props.name) ? buildIconUrl(props.dir, props.name) : ''))

const { data: svg } = await useAsyncData(
  computed(() => `pruvious-icon:${url.value}`),
  async () => {
    if (isEmpty(url.value)) {
      return ''
    }
    try {
      return await $fetch<string>(url.value, { responseType: 'text' })
    } catch (error) {
      if (import.meta.dev) {
        console.warn(`[pruvious] <PruviousIcon> failed to load '${url.value}'`, error)
      }
      return ''
    }
  },
  { watch: [url] },
)

const finalSvg = computed(() => {
  if (!isString(svg.value) || isEmpty(svg.value)) {
    return ''
  }

  const openMatch = svg.value.match(/<svg\b([^>]*)>/i)
  if (!openMatch) {
    return svg.value
  }

  const existing: Record<string, string> = {}
  const attrRe = /([a-zA-Z_:][\w:.\-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(openMatch[1]!)) !== null) {
    existing[m[1]!] = m[2] ?? m[3] ?? m[4] ?? ''
  }

  const merged: Record<string, string> = { ...existing }
  for (const [key, value] of Object.entries(attrs)) {
    if (isNull(value) || isUndefined(value) || value === false || isFunction(value)) {
      continue
    }
    if (key === 'class') {
      const incoming = normalizeClass(value as any)
      merged.class = [existing.class, incoming].filter((part) => !isEmpty(part)).join(' ')
    } else if (key === 'style') {
      const incoming = normalizeStyle(value as any)
      const incomingStr = isString(incoming)
        ? incoming
        : incoming
          ? Object.entries(incoming)
              .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`)
              .join(';')
          : ''
      merged.style = [existing.style, incomingStr].filter((part) => !isEmpty(part)).join(';')
    } else {
      merged[key] = String(value)
    }
  }

  const attrStr = Object.entries(merged)
    .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
    .join(' ')

  return svg.value.replace(/<svg\b[^>]*>/i, `<svg ${attrStr}>`)
})

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
</script>

<style scoped>
.pruvious-icon {
  display: contents;
}
</style>
