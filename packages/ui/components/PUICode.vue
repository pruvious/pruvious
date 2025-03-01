<template>
  <div
    @keydown.left.prevent
    @keydown.right.prevent
    @mouseleave="copied = false"
    class="pui-code"
    :style="{ '--pui-size': size }"
  >
    <div v-html="html"></div>
    <PUIButton
      v-if="copyCode && ready"
      v-pui-tooltip="{ content: copied ? copiedTooltip : copyTooltip, showOnCreate: copied }"
      :size="-2"
      @click="copy(copyCode === true ? code : copyCode)"
      variant="outline"
      class="pui-code-copy"
    >
      <Icon v-if="copied" mode="svg" name="tabler:clipboard-check" />
      <Icon v-else mode="svg" name="tabler:clipboard" />
    </PUIButton>
  </div>
</template>

<script lang="ts" setup>
import { transformerNotationHighlight } from '@shikijs/transformers'
import { useClipboard } from '@vueuse/core'
import type { CodeToHastOptions, HighlighterCore } from 'shiki'

const props = defineProps({
  /**
   * The code to display.
   */
  code: {
    type: String,
    required: true,
  },

  /**
   * The language of the code.
   *
   * @default 'typescript'
   */
  language: {
    type: String as PropType<
      'css' | 'html' | 'javascript' | 'json' | 'markdown' | 'shell' | 'sql' | 'typescript' | 'vue'
    >,
    default: 'typescript',
  },

  /**
   * A function that returns a new Shiki `HighlighterCore` instance.
   *
   * By default, the built-in `highlighter` function is used.
   * It supports the following languages:
   *
   * - css
   * - html
   * - javascript
   * - json
   * - shell
   * - sql
   * - typescript
   * - vue
   */
  highlighter: {
    type: Function as PropType<() => HighlighterCore | Promise<HighlighterCore>>,
    default: highlighter,
  },

  /**
   * Options to pass to the `codeToHtml` method of the Shiki `HighlighterCore` instance.
   *
   * @default
   * {
   *   lang: props.language,
   *   themes: { dark: 'github-dark', light: 'github-light' },
   *   defaultColor: 'light',
   *   transformers: [transformerNotationHighlight({ matchAlgorithm: 'v3' })],
   *   tabindex: -1,
   * }
   */
  codeToHtmlOptions: {
    type: Object as PropType<CodeToHastOptions<string, string>>,
  },

  /**
   * Controls the visibility and behavior of the copy button.
   *
   * - `true` - Shows the copy button and copies the code content when clicked.
   * - `string` - Shows the copy button and copies the specified string value when clicked.
   * - `false` - Hides the copy button.
   *
   * @default true
   */
  copyCode: {
    type: [Boolean, String],
    default: true,
  },

  /**
   * Specifies the tooltip text that appears when hovering over the copy button.
   *
   * @default 'Copy to clipboard'
   */
  copyTooltip: {
    type: String,
    default: 'Copy to clipboard',
  },

  /**
   * Specifies the tooltip text that appears when the code is copied.
   *
   * @default 'Copied'
   */
  copiedTooltip: {
    type: String,
    default: 'Copied',
  },

  /**
   * Adjusts the size of the component.
   *
   * Examples:
   *
   * - -2 (very small)
   * - -1 (small)
   * - 0 (default size)
   * - 1 (large)
   * - 2 (very large)
   *
   * By default, the value is inherited as the CSS variable `--pui-size` from the parent element.
   */
  size: {
    type: Number,
  },
})

const html = ref('')
const shiki = await props.highlighter()
const ready = ref(false)
const { copy, copied } = useClipboard()

watch(() => props.code, refresh, { immediate: true })

function refresh() {
  html.value = shiki.codeToHtml(
    props.code,
    props.codeToHtmlOptions ?? {
      lang: props.language,
      themes: { dark: 'github-dark', light: 'github-light' },
      defaultColor: 'light',
      transformers: [transformerNotationHighlight({ matchAlgorithm: 'v3' })],
      tabindex: -1,
    },
  )

  setTimeout(() => {
    ready.value = true
  })
}
</script>

<style>
.pui-code {
  --pui-padding: 1em;
  position: relative;
}

.pui-code .shiki {
  width: 100%;
  max-width: 100%;
  padding: calc(var(--pui-padding) - 0.0625rem) var(--pui-padding);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--pui-foreground) / 0.25) transparent;
  border-width: 1px;
  border-radius: var(--pui-radius);
  outline: none;
  font-family: var(--pui-font-mono);
  font-size: calc((1rem + var(--pui-size) * 0.125rem) - 0.0625rem);
  font-style: normal;
}

.pui-code .shiki.github-light {
  background-color: hsl(var(--pui-card)) !important;
}

.dark .pui-code .shiki,
.dark .pui-code .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}

.dark .pui-code .shiki.github-dark,
.dark .pui-code .shiki.github-dark span {
  background-color: hsl(var(--pui-card)) !important;
}

.pui-code .shiki code {
  display: block;
  min-width: 100%;
  width: fit-content;
  font-family: var(--pui-font-mono);
}

.pui-code .shiki .line {
  display: inline-block;
  width: 100%;
  padding-top: 0.0625rem;
  padding-bottom: 0.0625rem;
}

.pui-code .shiki .line.highlighted {
  width: calc(100% + var(--pui-padding) * 2);
  margin-right: calc(var(--pui-padding) * -1);
  margin-left: calc(var(--pui-padding) * -1);
  padding-right: calc(var(--pui-padding) - 0.0625rem);
  padding-left: calc(var(--pui-padding) - 0.0625rem);
}

.pui-code .shiki .line.highlighted {
  background-color: hsl(var(--pui-accent) / 0.64);
}

.dark .pui-code .shiki .line.highlighted {
  background-color: hsl(var(--pui-accent) / 0.36) !important;
}

.dark .pui-code .shiki .line.highlighted span {
  background-color: transparent !important;
}

.pui-code-copy {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  z-index: 1;
  display: none;
  min-width: 0;
  max-height: calc(100% - 1em);
  aspect-ratio: 1;
}

.pui-code:hover .pui-code-copy {
  --pui-background: var(--pui-card);
  display: inline-flex;
}
</style>
