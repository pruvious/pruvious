<template>
  <Showcase>
    <PUIDynamicChips
      v-model="value"
      :choicesResolver="choicesResolver"
      :disabled="disabled"
      :error="state.hasErrors"
      :selectedChoicesResolver="selectedChoicesResolver"
      :size="state.size"
      :variant="variant"
      id="dynamic-chips"
      placeholder="Placeholder..."
      class="pui-dynamic-chips-wrapper"
    />

    <template #config>
      <ShowcaseConfig>
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
import type {
  PUIDynamicSelectChoiceModel,
  PUIDynamicSelectPaginatedChoices,
} from '../../components/PUIDynamicSelect.vue'

const state = useShowcase()
const value = ref<number[]>([])
const disabled = ref(false)
const variant = ref<'primary' | 'secondary' | 'accent'>('accent')

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

async function selectedChoicesResolver(): Promise<PUIDynamicSelectChoiceModel[]> {
  if (!value.value) {
    return []
  }

  const data = await Promise.all(
    value.value.map((id) =>
      $fetch<{
        id: number
        name: string
        origin: { name: string }
      }>(`https://rickandmortyapi.com/api/character/${id}`, {
        ignoreResponseError: true,
      }),
    ),
  )

  return data
    .filter((item) => !('error' in item))
    .map((item) => ({
      label: item.name,
      value: item.id,
      detail: `Origin: ${item.origin.name}`,
    }))
}
</script>

<style scoped>
.pui-dynamic-chips-wrapper {
  width: 20rem;
  max-width: 100%;
}
</style>
