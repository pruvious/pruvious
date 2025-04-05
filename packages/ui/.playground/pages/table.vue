<template>
  <Showcase>
    <div class="wrapper">
      <PUITable
        v-model:selected="selected"
        v-model:sort="sort"
        :columns="columns"
        :data="data"
        :selectable="selectable"
        :selectAllState="selectAllState"
        :size="state.size"
        @selectAll="
          (value) => {
            if (value) {
              selected = data.reduce((acc, row) => ({ ...acc, [row.id]: true }), {})
              selectAllState = true
            } else {
              selected = {}
              selectAllState = false
            }
          }
        "
        @update:selected="
          () => {
            if (selectAllState) {
              selectAllState = Object.values(selected).every((value) => !value)
                ? false
                : Object.values(selected).every((value) => value) || 'indeterminate'
            }
          }
        "
        @update:sort="sortData()"
      >
        <template #cell="{ row, key }">
          <div v-if="key === 'name'" style="color: hsl(var(--pui-foreground))">{{ row.name }}</div>
          <div v-else-if="key === 'types'">
            <div style="display: flex; gap: 0.375rem">
              <PUIBadge v-for="type in row.types" :key="type" :size="state.size - 1" color="accent">
                {{ type }}
              </PUIBadge>
            </div>
          </div>
          <div v-else-if="key === 'height'">{{ row.height }} m</div>
          <div v-else-if="key === 'weight'">{{ row.weight }} kg</div>
          <div v-else>{{ row[key] }}</div>
        </template>

        <template #actions="{ row }">
          <PUIDropdownItem @click="puiToast('JSON', { description: '```\n' + JSON.stringify(row, null, 2) + '\n```' })">
            <Icon mode="svg" name="tabler:code" />
            <span>Show JSON</span>
          </PUIDropdownItem>
        </template>
      </PUITable>
    </div>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseSize />

        <PUIField>
          <PUIFieldLabel>
            <label for="selectable">Selectable</label>
          </PUIFieldLabel>
          <PUIButtonGroup
            v-model="selectable"
            :choices="[
              { label: 'No', value: false },
              { label: 'Yes', value: true },
            ]"
            :size="-2"
            id="selectable"
          />
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
import { puiColumn, puiTable } from '../../pui/table'
import { puiToast } from '../../pui/toast'

const state = useShowcase()
const selectable = ref(false)
const selected = ref<Record<number, boolean>>({})
const selectAllState = ref<boolean | 'indeterminate'>(false)
const { columns, data, sort } = puiTable({
  columns: {
    id: puiColumn<number>({ label: 'ID', sortable: 'numeric', width: '4rem', minWidth: '4rem' }),
    name: puiColumn<string>({ label: 'Name', sortable: 'text', width: '8rem', minWidth: '8rem' }),
    types: puiColumn<string[]>({ label: 'Types', sortable: 'text', width: '14rem', minWidth: '14rem' }),
    height: puiColumn<number>({ label: 'Height', sortable: 'numeric', width: '8rem', minWidth: '8rem' }),
    weight: puiColumn<number>({ label: 'Weight', sortable: 'numeric', width: '8rem', minWidth: '8rem' }),
  },
  sort: { column: 'id', direction: 'asc' },
  data: [
    { id: 1, name: 'Bulbasaur', types: ['Grass', 'Poison'], height: 0.7, weight: 6.9 },
    { id: 2, name: 'Ivysaur', types: ['Grass', 'Poison'], height: 1, weight: 13 },
    { id: 3, name: 'Venusaur', types: ['Grass', 'Poison'], height: 2, weight: 100 },
    { id: 4, name: 'Charmander', types: ['Fire'], height: 0.6, weight: 8.5 },
    { id: 5, name: 'Charmeleon', types: ['Fire'], height: 1.1, weight: 19 },
    { id: 6, name: 'Charizard', types: ['Fire', 'Flying'], height: 1.7, weight: 90.5 },
    { id: 7, name: 'Squirtle', types: ['Water'], height: 0.5, weight: 9 },
    { id: 8, name: 'Wartortle', types: ['Water'], height: 1, weight: 22.5 },
    { id: 9, name: 'Blastoise', types: ['Water'], height: 1.6, weight: 85.5 },
    { id: 10, name: 'Caterpie', types: ['Bug'], height: 0.3, weight: 2.9 },
    { id: 11, name: 'Metapod', types: ['Bug'], height: 0.7, weight: 9.9 },
    { id: 12, name: 'Butterfree', types: ['Bug', 'Flying'], height: 1.1, weight: 32 },
    { id: 13, name: 'Weedle', types: ['Bug', 'Poison'], height: 0.3, weight: 3.2 },
    { id: 14, name: 'Kakuna', types: ['Bug', 'Poison'], height: 0.6, weight: 10 },
    { id: 15, name: 'Beedrill', types: ['Bug', 'Poison'], height: 1, weight: 29.5 },
    { id: 16, name: 'Pidgey', types: ['Normal', 'Flying'], height: 0.3, weight: 1.8 },
    { id: 17, name: 'Pidgeotto', types: ['Normal', 'Flying'], height: 1.1, weight: 30 },
    { id: 18, name: 'Pidgeot', types: ['Normal', 'Flying'], height: 1.5, weight: 39.5 },
    { id: 19, name: 'Rattata', types: ['Normal'], height: 0.3, weight: 3.5 },
    { id: 20, name: 'Raticate', types: ['Normal'], height: 0.7, weight: 18.5 },
    { id: 21, name: 'Spearow', types: ['Normal', 'Flying'], height: 0.3, weight: 2 },
    { id: 22, name: 'Fearow', types: ['Normal', 'Flying'], height: 1.2, weight: 38 },
    { id: 23, name: 'Ekans', types: ['Poison'], height: 2, weight: 6.9 },
    { id: 24, name: 'Arbok', types: ['Poison'], height: 3.5, weight: 65 },
    { id: 25, name: 'Pikachu', types: ['Electric'], height: 0.4, weight: 6 },
    { id: 26, name: 'Raichu', types: ['Electric'], height: 0.8, weight: 30 },
    { id: 27, name: 'Sandshrew', types: ['Ground'], height: 0.6, weight: 12 },
    { id: 28, name: 'Sandslash', types: ['Ground'], height: 1, weight: 29.5 },
    { id: 29, name: 'Nidoran♀', types: ['Poison'], height: 0.4, weight: 7 },
    { id: 30, name: 'Nidorina', types: ['Poison'], height: 0.8, weight: 20 },
    { id: 31, name: 'Nidoqueen', types: ['Poison', 'Ground'], height: 1.3, weight: 60 },
    { id: 32, name: 'Nidoran♂', types: ['Poison'], height: 0.5, weight: 9 },
    { id: 33, name: 'Nidorino', types: ['Poison'], height: 0.9, weight: 19.5 },
    { id: 34, name: 'Nidoking', types: ['Poison', 'Ground'], height: 1.4, weight: 62 },
    { id: 35, name: 'Clefairy', types: ['Fairy'], height: 0.6, weight: 7.5 },
    { id: 36, name: 'Clefable', types: ['Fairy'], height: 1.3, weight: 40 },
    { id: 37, name: 'Vulpix', types: ['Fire'], height: 0.6, weight: 9.9 },
    { id: 38, name: 'Ninetales', types: ['Fire'], height: 1.1, weight: 19.9 },
    { id: 39, name: 'Jigglypuff', types: ['Normal', 'Fairy'], height: 0.5, weight: 5.5 },
    { id: 40, name: 'Wigglytuff', types: ['Normal', 'Fairy'], height: 1, weight: 12 },
    { id: 41, name: 'Zubat', types: ['Poison', 'Flying'], height: 0.8, weight: 7.5 },
    { id: 42, name: 'Golbat', types: ['Poison', 'Flying'], height: 1.6, weight: 55 },
    { id: 43, name: 'Oddish', types: ['Grass', 'Poison'], height: 0.5, weight: 5.4 },
    { id: 44, name: 'Gloom', types: ['Grass', 'Poison'], height: 0.8, weight: 8.6 },
    { id: 45, name: 'Vileplume', types: ['Grass', 'Poison'], height: 1.2, weight: 18.6 },
    { id: 46, name: 'Paras', types: ['Bug', 'Grass'], height: 0.3, weight: 5.4 },
    { id: 47, name: 'Parasect', types: ['Bug', 'Grass'], height: 1, weight: 29.5 },
    { id: 48, name: 'Venonat', types: ['Bug', 'Poison'], height: 1, weight: 30 },
    { id: 49, name: 'Venomoth', types: ['Bug', 'Poison'], height: 1.5, weight: 12.5 },
    { id: 50, name: 'Diglett', types: ['Ground'], height: 0.2, weight: 0.8 },
    { id: 51, name: 'Dugtrio', types: ['Ground'], height: 0.7, weight: 33.3 },
    { id: 52, name: 'Meowth', types: ['Normal'], height: 0.4, weight: 4.2 },
    { id: 53, name: 'Persian', types: ['Normal'], height: 1.0, weight: 32.0 },
    { id: 54, name: 'Psyduck', types: ['Water'], height: 0.8, weight: 19.6 },
    { id: 55, name: 'Golduck', types: ['Water'], height: 1.7, weight: 76.6 },
    { id: 56, name: 'Mankey', types: ['Fighting'], height: 0.5, weight: 28.0 },
    { id: 57, name: 'Primeape', types: ['Fighting'], height: 1.0, weight: 32.0 },
    { id: 58, name: 'Growlithe', types: ['Fire'], height: 0.7, weight: 19.0 },
    { id: 59, name: 'Arcanine', types: ['Fire'], height: 1.9, weight: 155.0 },
    { id: 60, name: 'Poliwag', types: ['Water'], height: 0.6, weight: 12.4 },
    { id: 61, name: 'Poliwhirl', types: ['Water'], height: 1.0, weight: 20.0 },
    { id: 62, name: 'Poliwrath', types: ['Water', 'Fighting'], height: 1.3, weight: 54.0 },
    { id: 63, name: 'Abra', types: ['Psychic'], height: 0.9, weight: 19.5 },
    { id: 64, name: 'Kadabra', types: ['Psychic'], height: 1.3, weight: 56.5 },
    { id: 65, name: 'Alakazam', types: ['Psychic'], height: 1.5, weight: 48.0 },
    { id: 66, name: 'Machop', types: ['Fighting'], height: 0.8, weight: 19.5 },
    { id: 67, name: 'Machoke', types: ['Fighting'], height: 1.5, weight: 70.5 },
    { id: 68, name: 'Machamp', types: ['Fighting'], height: 1.6, weight: 130.0 },
    { id: 69, name: 'Bellsprout', types: ['Grass', 'Poison'], height: 0.7, weight: 4.0 },
    { id: 70, name: 'Weepinbell', types: ['Grass', 'Poison'], height: 1.0, weight: 6.4 },
    { id: 71, name: 'Victreebel', types: ['Grass', 'Poison'], height: 1.7, weight: 15.5 },
    { id: 72, name: 'Tentacool', types: ['Water', 'Poison'], height: 0.9, weight: 45.5 },
    { id: 73, name: 'Tentacruel', types: ['Water', 'Poison'], height: 1.6, weight: 55.0 },
    { id: 74, name: 'Geodude', types: ['Rock', 'Ground'], height: 0.4, weight: 20.0 },
    { id: 75, name: 'Graveler', types: ['Rock', 'Ground'], height: 1.0, weight: 105.0 },
    { id: 76, name: 'Golem', types: ['Rock', 'Ground'], height: 1.4, weight: 300.0 },
    { id: 77, name: 'Ponyta', types: ['Fire'], height: 1.0, weight: 30.0 },
    { id: 78, name: 'Rapidash', types: ['Fire'], height: 1.7, weight: 95.0 },
    { id: 79, name: 'Slowpoke', types: ['Water', 'Psychic'], height: 1.2, weight: 36.0 },
    { id: 80, name: 'Slowbro', types: ['Water', 'Psychic'], height: 1.6, weight: 78.5 },
    { id: 81, name: 'Magnemite', types: ['Electric', 'Steel'], height: 0.3, weight: 6.0 },
    { id: 82, name: 'Magneton', types: ['Electric', 'Steel'], height: 1.0, weight: 60.0 },
    { id: 83, name: "Farfetch'd", types: ['Normal', 'Flying'], height: 0.8, weight: 15.0 },
    { id: 84, name: 'Doduo', types: ['Normal', 'Flying'], height: 1.4, weight: 39.2 },
    { id: 85, name: 'Dodrio', types: ['Normal', 'Flying'], height: 1.8, weight: 85.2 },
    { id: 86, name: 'Seel', types: ['Water'], height: 1.1, weight: 90.0 },
    { id: 87, name: 'Dewgong', types: ['Water', 'Ice'], height: 1.7, weight: 120.0 },
    { id: 88, name: 'Grimer', types: ['Poison'], height: 0.9, weight: 30.0 },
    { id: 89, name: 'Muk', types: ['Poison'], height: 1.2, weight: 30.0 },
    { id: 90, name: 'Shellder', types: ['Water'], height: 0.3, weight: 4.0 },
    { id: 91, name: 'Cloyster', types: ['Water', 'Ice'], height: 1.5, weight: 132.5 },
    { id: 92, name: 'Gastly', types: ['Ghost', 'Poison'], height: 1.3, weight: 0.1 },
    { id: 93, name: 'Haunter', types: ['Ghost', 'Poison'], height: 1.6, weight: 0.1 },
    { id: 94, name: 'Gengar', types: ['Ghost', 'Poison'], height: 1.5, weight: 40.5 },
    { id: 95, name: 'Onix', types: ['Rock', 'Ground'], height: 8.8, weight: 210.0 },
    { id: 96, name: 'Drowzee', types: ['Psychic'], height: 1.0, weight: 32.4 },
    { id: 97, name: 'Hypno', types: ['Psychic'], height: 1.6, weight: 75.6 },
    { id: 98, name: 'Krabby', types: ['Water'], height: 0.4, weight: 6.5 },
    { id: 99, name: 'Kingler', types: ['Water'], height: 1.3, weight: 60.0 },
    { id: 100, name: 'Voltorb', types: ['Electric'], height: 0.5, weight: 10.4 },
    { id: 101, name: 'Electrode', types: ['Electric'], height: 1.2, weight: 66.6 },
    { id: 102, name: 'Exeggcute', types: ['Grass', 'Psychic'], height: 0.4, weight: 2.5 },
    { id: 103, name: 'Exeggutor', types: ['Grass', 'Psychic'], height: 2.0, weight: 120.0 },
    { id: 104, name: 'Cubone', types: ['Ground'], height: 0.4, weight: 6.5 },
    { id: 105, name: 'Marowak', types: ['Ground'], height: 1.0, weight: 45.0 },
    { id: 106, name: 'Hitmonlee', types: ['Fighting'], height: 1.5, weight: 49.8 },
    { id: 107, name: 'Hitmonchan', types: ['Fighting'], height: 1.4, weight: 50.2 },
    { id: 108, name: 'Lickitung', types: ['Normal'], height: 1.2, weight: 65.5 },
    { id: 109, name: 'Koffing', types: ['Poison'], height: 0.6, weight: 1.0 },
    { id: 110, name: 'Weezing', types: ['Poison'], height: 1.2, weight: 9.5 },
    { id: 111, name: 'Rhyhorn', types: ['Ground', 'Rock'], height: 1.0, weight: 115.0 },
    { id: 112, name: 'Rhydon', types: ['Ground', 'Rock'], height: 1.9, weight: 120.0 },
    { id: 113, name: 'Chansey', types: ['Normal'], height: 1.1, weight: 34.6 },
    { id: 114, name: 'Tangela', types: ['Grass'], height: 1.0, weight: 35.0 },
    { id: 115, name: 'Kangaskhan', types: ['Normal'], height: 2.2, weight: 80.0 },
    { id: 116, name: 'Horsea', types: ['Water'], height: 0.4, weight: 8.0 },
    { id: 117, name: 'Seadra', types: ['Water'], height: 1.2, weight: 25.0 },
    { id: 118, name: 'Goldeen', types: ['Water'], height: 0.6, weight: 15.0 },
    { id: 119, name: 'Seaking', types: ['Water'], height: 1.3, weight: 39.0 },
    { id: 120, name: 'Staryu', types: ['Water'], height: 0.8, weight: 34.5 },
    { id: 121, name: 'Starmie', types: ['Water', 'Psychic'], height: 1.1, weight: 80.0 },
    { id: 122, name: 'Mr. Mime', types: ['Psychic', 'Fairy'], height: 1.3, weight: 54.5 },
    { id: 123, name: 'Scyther', types: ['Bug', 'Flying'], height: 1.5, weight: 56.0 },
    { id: 124, name: 'Jynx', types: ['Ice', 'Psychic'], height: 1.4, weight: 40.6 },
    { id: 125, name: 'Electabuzz', types: ['Electric'], height: 1.1, weight: 30.0 },
    { id: 126, name: 'Magmar', types: ['Fire'], height: 1.3, weight: 44.5 },
    { id: 127, name: 'Pinsir', types: ['Bug'], height: 1.5, weight: 55.0 },
    { id: 128, name: 'Tauros', types: ['Normal'], height: 1.4, weight: 88.4 },
    { id: 129, name: 'Magikarp', types: ['Water'], height: 0.9, weight: 10.0 },
    { id: 130, name: 'Gyarados', types: ['Water', 'Flying'], height: 6.5, weight: 235.0 },
    { id: 131, name: 'Lapras', types: ['Water', 'Ice'], height: 2.5, weight: 220.0 },
    { id: 132, name: 'Ditto', types: ['Normal'], height: 0.3, weight: 4.0 },
    { id: 133, name: 'Eevee', types: ['Normal'], height: 0.3, weight: 6.5 },
    { id: 134, name: 'Vaporeon', types: ['Water'], height: 1.0, weight: 29.0 },
    { id: 135, name: 'Jolteon', types: ['Electric'], height: 0.8, weight: 24.5 },
    { id: 136, name: 'Flareon', types: ['Fire'], height: 0.9, weight: 25.0 },
    { id: 137, name: 'Porygon', types: ['Normal'], height: 0.8, weight: 36.5 },
    { id: 138, name: 'Omanyte', types: ['Rock', 'Water'], height: 0.4, weight: 7.5 },
    { id: 139, name: 'Omastar', types: ['Rock', 'Water'], height: 1.0, weight: 35.0 },
    { id: 140, name: 'Kabuto', types: ['Rock', 'Water'], height: 0.5, weight: 11.5 },
    { id: 141, name: 'Kabutops', types: ['Rock', 'Water'], height: 1.3, weight: 40.5 },
    { id: 142, name: 'Aerodactyl', types: ['Rock', 'Flying'], height: 1.8, weight: 59.0 },
    { id: 143, name: 'Snorlax', types: ['Normal'], height: 2.1, weight: 460.0 },
    { id: 144, name: 'Articuno', types: ['Ice', 'Flying'], height: 1.7, weight: 55.4 },
    { id: 145, name: 'Zapdos', types: ['Electric', 'Flying'], height: 1.6, weight: 52.6 },
    { id: 146, name: 'Moltres', types: ['Fire', 'Flying'], height: 2.0, weight: 60.0 },
    { id: 147, name: 'Dratini', types: ['Dragon'], height: 1.8, weight: 3.3 },
    { id: 148, name: 'Dragonair', types: ['Dragon'], height: 4.0, weight: 16.5 },
    { id: 149, name: 'Dragonite', types: ['Dragon', 'Flying'], height: 2.2, weight: 210.0 },
    { id: 150, name: 'Mewtwo', types: ['Psychic'], height: 2.0, weight: 122.0 },
    { id: 151, name: 'Mew', types: ['Psychic'], height: 0.4, weight: 4.0 },
  ],
})

function sortData() {
  data.value.sort((a, b) => {
    const key = sort.value!.column
    const column = columns.value[key]
    const direction = sort.value!.direction === 'asc' ? 1 : -1
    const valueA = a[key]
    const valueB = b[key]
    if (column.sortable === 'numeric') {
      return (Number(valueA) - Number(valueB)) * direction
    }
    return String(valueA).localeCompare(String(valueB)) * direction
  })
}
</script>

<style scoped>
.wrapper {
  width: calc(100% + 1rem);
  max-width: 64rem;
  height: calc(100vh - 2rem);
  margin: -0.5rem;
  margin-top: calc(-0.5rem + 1px);
  overflow: auto;
}
</style>
