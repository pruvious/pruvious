<template>
  <Showcase>
    <PUISelect
      v-model="value"
      :choices="choices === 'few' ? choicesFew : choicesMany"
      :disabled="disabled"
      :error="state.hasErrors"
      :size="state.size"
      id="select"
      placeholder="Placeholder..."
      class="pui-select-wrapper"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="value" />
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="choices">Choices</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="choices"
            :choices="[
              { label: 'Few', value: 'few' },
              { label: 'Many', value: 'many' },
            ]"
            :size="-2"
            id="choices"
          />
        </PUIField>

        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const choicesFew = [
  { label: 'Cat', value: 'cat' },
  { label: 'Dog', value: 'dog' },
  { label: 'Gastly', value: 'gastly', disabled: true },
  { label: 'Hamster', value: 'hamster' },
  { label: 'Parrot', value: 'parrot' },
  { label: 'Rabbit', value: 'rabbit' },
]

const choicesMany = [
  { label: 'UTC', value: 'utc' },
  {
    group: 'North America',
    choices: [
      { label: 'Eastern Standard Time (EST)', value: 'est' },
      { label: 'Central Standard Time (CST)', value: 'cst' },
      { label: 'Mountain Standard Time (MST)', value: 'mst' },
      { label: 'Pacific Standard Time (PST)', value: 'pst' },
      { label: 'Alaska Standard Time (AKST)', value: 'akst' },
      { label: 'Hawaii-Aleutian Standard Time (HST)', value: 'hst' },
    ],
  },
  {
    group: 'Europe & Africa',
    choices: [
      { label: 'Greenwich Mean Time (GMT)', value: 'gmt' },
      { label: 'Central European Time (CET)', value: 'cet' },
      { label: 'Eastern European Time (EET)', value: 'eet' },
      { label: 'Western European Summer Time (WEST)', value: 'west' },
      { label: 'Central Africa Time (CAT)', value: 'cat' },
      { label: 'East Africa Time (EAT)', value: 'eat' },
    ],
  },
  {
    group: 'Asia',
    choices: [
      { label: 'Moscow Time (MSK)', value: 'msk' },
      { label: 'India Standard Time (IST)', value: 'ist' },
      { label: 'China Standard Time (CST)', value: 'cst_china' },
      { label: 'Japan Standard Time (JST)', value: 'jst' },
      { label: 'Korea Standard Time (KST)', value: 'kst' },
      { label: 'Indonesia Central Standard Time (WITA)', value: 'ist_indonesia' },
    ],
  },
  {
    group: 'Australia & Pacific',
    choices: [
      { label: 'Australian Western Standard Time (AWST)', value: 'awst' },
      { label: 'Australian Central Standard Time (ACST)', value: 'acst' },
      { label: 'Australian Eastern Standard Time (AEST)', value: 'aest' },
      { label: 'New Zealand Standard Time (NZST)', value: 'nzst' },
      { label: 'Fiji Time (FJT)', value: 'fjt' },
    ],
  },
  {
    group: 'South America',
    choices: [
      { label: 'Argentina Time (ART)', value: 'art' },
      { label: 'Bolivia Time (BOT)', value: 'bot' },
      { label: 'Brasilia Time (BRT)', value: 'brt' },
      { label: 'Chile Standard Time (CLT)', value: 'clt' },
    ],
  },
]

const state = useShowcase()
const value = ref()
const choices = ref<'few' | 'many'>('few')
const disabled = ref(false)

watch(
  choices,
  () => {
    value.value = choices.value === 'few' ? 'cat' : 'utc'
  },
  { immediate: true },
)
</script>

<style scoped>
.pui-select-wrapper {
  width: 16rem;
}
</style>
