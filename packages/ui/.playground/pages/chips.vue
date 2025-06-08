<template>
  <Showcase>
    <PUIChips
      v-model="value"
      :choices="withChoices ? choices : false"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      :variant="variant"
      id="input"
      placeholder="Placeholder..."
      class="pui-chips"
    />

    <template #config>
      <ShowcaseConfig>
        <PUIField>
          <PUIFieldLabel>
            <label for="with-choices">With choices</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="withChoices"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="with-choices"
          />
        </PUIField>

        <PUIField>
          <PUIFieldLabel>
            <label for="variant">Variant</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="variant"
            :choices="[
              { label: 'Primary', value: 'primary' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Accent', value: 'accent' },
            ]"
            id="variant"
          />
        </PUIField>

        <ShowcaseSize />
        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const disabled = ref(false)
const value = ref(['red', 'green', 'blue'])
const withChoices = ref(true)
const choices = ref([
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
  { label: 'Blue', value: 'blue' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' },
  { label: 'Pink', value: 'pink' },
  { label: 'Brown', value: 'brown' },
  { label: 'Gray', value: 'gray' },
  { label: 'Black', value: 'black' },
  { label: 'White', value: 'white' },
  { label: 'Cyan', value: 'cyan' },
  { label: 'Magenta', value: 'magenta' },
  { label: 'Lime', value: 'lime' },
  { label: 'Teal', value: 'teal' },
  { label: 'Olive', value: 'olive' },
  { label: 'Navy', value: 'navy' },
  { label: 'Maroon', value: 'maroon' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gold', value: 'gold' },
  { label: 'Coral', value: 'coral' },
  { label: 'Salmon', value: 'salmon' },
  { label: 'Turquoise', value: 'turquoise' },
  { label: 'Violet', value: 'violet' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Lavender', value: 'lavender' },
  { label: 'Peach', value: 'peach' },
  { label: 'Mint', value: 'mint' },
  { label: 'Plum', value: 'plum' },
  { label: 'Beige', value: 'beige' },
  { label: 'Ivory', value: 'ivory' },
  { label: 'Khaki', value: 'khaki' },
  { label: 'Charcoal', value: 'charcoal' },
  { label: 'Steel', value: 'steel' },
  { label: 'Copper', value: 'copper' },
  { label: 'Bronze', value: 'bronze' },
  { label: 'Rust', value: 'rust' },
  { label: 'Slate', value: 'slate' },
  { label: 'Ash', value: 'ash' },
  { label: 'Sand', value: 'sand' },
  { label: 'Cream', value: 'cream' },
  { label: 'Mint Cream', value: 'mint-cream' },
])
const variant = ref<'primary' | 'secondary' | 'accent'>('accent')
</script>

<style scoped>
.pui-chips {
  width: 20rem;
  max-width: 100%;
}
</style>
