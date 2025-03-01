<template>
  <Showcase>
    <div>
      <PUIButton :size="state.size" @click="openDialog()">Open dialog</PUIButton>
    </div>

    <template #config>
      <ShowcaseConfig>
        <ShowcaseValue :value="result" label="Last result" />
        <ShowcaseSize />
      </ShowcaseConfig>
    </template>
  </Showcase>
</template>

<script lang="ts" setup>
const state = useShowcase()
const result = ref('undefined')

async function openDialog() {
  result.value =
    (await puiDialog({
      content: 'Are you uncertain?',
      actions: [
        { name: 'no', label: 'No' },
        { name: 'maybe', label: 'Maybe' },
        { name: 'yes', label: 'Yes', variant: 'primary' },
      ],
    })) ?? 'undefined'
}
</script>
