<template>
  <Showcase>
    <PUIDynamicSelect
      v-model="value"
      :choicesResolver="choicesResolver"
      :disabled="disabled"
      :error="state.hasErrors"
      :selectedChoiceResolver="selectedChoiceResolver"
      :size="state.size"
      id="dynamic-select"
      placeholder="Placeholder..."
      class="pui-dynamic-select-wrapper"
    />

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="value" />
        <ShowcaseSize />
        <ShowcaseHasErrors />
        <ShowcaseDisabled v-model="disabled" />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '../../components/PUIDynamicSelect.vue'

const state = useShowcase()
const value = ref<number | null>(null)
const disabled = ref(false)

async function choicesResolver(page: number, keyword: string): Promise<PUIDynamicSelectPaginatedChoices> {
  const data = await $fetch<{
    info: { count: number; pages: number }
    results: { id: number; name: string; origin: { name: string } }[]
  }>(`https://rickandmortyapi.com/api/character?page=${page}&name=${keyword}`, {
    ignoreResponseError: true,
  })

  return 'error' in data
    ? {
        choices: [],
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: 0,
      }
    : {
        choices: data.results.map((character) => ({
          label: character.name,
          value: character.id,
          detail: `Origin: ${character.origin.name}`,
        })),
        currentPage: page,
        lastPage: data.info.pages,
        perPage: 10,
        total: data.info.count,
      }
}

async function selectedChoiceResolver(): Promise<PUIDynamicSelectChoiceModel | null> {
  if (!value.value) {
    return null
  }

  const data = await $fetch<{
    id: number
    name: string
    origin: { name: string }
  }>(`https://rickandmortyapi.com/api/character/${value.value}`, {
    ignoreResponseError: true,
  })

  return 'error' in data ? null : { label: data.name, value: data.id, detail: `Origin: ${data.origin.name}` }
}
</script>

<style scoped>
.pui-dynamic-select-wrapper {
  width: 16rem;
}
</style>
