<template>
  <Showcase>
    <PUIEditor v-model="content" />

    <template #config>
      <ShowcaseConfig>
        <PUIField>
          <PUIFieldLabel>
            <label for="icon">Actions</label>
          </PUIFieldLabel>
          <PUIButton @click="content = ''" variant="outline">Clear Content</PUIButton>
        </PUIField>
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const content = ref('Welcome to the Pruvious UI Editor!')
</script>

<style scoped></style>
