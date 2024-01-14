<template>
  <div class="flex items-end gap-2 p-4">
    <component
      v-model="from"
      :is="TextField"
      :options="{
        label: 'Test path or URL',
        description:
          'Enter a path (e.g., **/news**) or a full URL (e.g., **https://my-site.com/news**) to observe the impacts of the redirects.',
        placeholder: 'e.g., /news',
      }"
      @update:modelValue="refresh()"
      fieldKey="from"
    />

    <div class="flex min-w-6 flex-col items-center gap-0.5 pb-2.5">
      <PruviousIconArrowBounce class="h-4 w-4" />
      <span
        v-if="code"
        v-pruvious-tooltip="[
          __('pruvious-dashboard', '**301** - Moved permanently'),
          __('pruvious-dashboard', '**302** - Temporarily moved'),
        ]"
        class="text-xs"
      >
        {{ code }}
      </span>
    </div>

    <component
      v-model="to"
      :is="TextField"
      :options="{ label: 'Redirects to', description: 'The final path or URL after applying all redirects.' }"
      fieldKey="from"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'
import { type CastedFieldType } from '#pruvious'
import { textFieldComponent } from '#pruvious/dashboard'
import { usePruviousRedirectsTest } from '../../composables/dashboard/redirects-test'
import { __, loadTranslatableStrings } from '../../composables/translatable-strings'

const props = defineProps<{
  record: Record<string, any>
  errors: Record<string, string>
  compact: boolean
  disabled: boolean
}>()

defineEmits<{
  'update:record': [Record<string, any>]
}>()

const TextField = textFieldComponent()

const from = usePruviousRedirectsTest()
const to = ref('')
const code = ref<number | null>(null)

watch(
  () => props.record.rules,
  () => refresh(),
  { deep: true, immediate: true },
)

await loadTranslatableStrings('pruvious-dashboard')

function refresh() {
  const rules = props.record.rules as CastedFieldType['redirects']['rules']

  try {
    const url = new URL(from.value, 'http://__pruvious')

    for (const rule of rules) {
      if (rule.isRegExp) {
        try {
          const match = url.pathname.match(new RegExp(rule.fromRegExp))

          if (match) {
            to.value = rule.toRegExp.replace(/\$([1-9][0-9]*)/g, (_, i) => match[+i] ?? '')
            code.value = rule.code ? +rule.code : 302

            if (rule.forwardQueryParams && url.search) {
              to.value += to.value.includes('?') ? url.search.replace('?', '&') : url.search
            }

            return
          }
        } catch {}
      } else if (rule.from === url.pathname) {
        to.value = rule.to
        code.value = rule.code ? +rule.code : 302

        if (rule.forwardQueryParams && url.search) {
          to.value += to.value.includes('?') ? url.search.replace('?', '&') : url.search
        }

        return
      }
    }
  } catch {}

  to.value = from.value
  code.value = null
}
</script>
