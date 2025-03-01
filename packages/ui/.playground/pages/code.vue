<template>
  <Showcase>
    <PUICode :code="code[language]" :language="language" :size="state.size" class="pui-code" />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="language">Language</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="language"
            :choices="[
              { label: 'Vue', value: 'vue' },
              { label: 'TypeScript', value: 'typescript' },
            ]"
            :size="-2"
            id="language"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const language = ref<'vue' | 'typescript'>('vue')
const code = {
  vue: `&lt;template>
  <div>
    <p>Hello, {{ name }}!</p><!-- [!code highlight] -->
  </div>
</template>

<script lang="ts" setup>
defineProps({
  name: {// [!code highlight]
    type: String,// [!code highlight]
    required: true,// [!code highlight]
  },// [!code highlight]
})
&lt;/script>`.replaceAll('&lt;', '<'),
  typescript: `/**
 * Retrieves the normalized index at index \`n\` of an \`array\`.
 * If \`n\` is negative, the nth normalized index from the end is returned.
 *
 * @example
 * \`\`\`ts
 * nth(['foo', 'bar'], 0)  // 0
 * nth(['foo', 'bar'], 1)  // 1
 * nth(['foo', 'bar'], 2)  // 0
 * nth(['foo', 'bar'], -2) // 0
 * nth(['foo', 'bar'], -1) // 1
 * \`\`\`
 */
export function nthIndex<T>(array: T[], n: number): number {
  n = n % array.length
  n += n < 0 ? array.length : 0
  return n// [!code highlight]
}`,
}
</script>

<style scoped>
.pui-code {
  width: 32rem;
}
</style>
