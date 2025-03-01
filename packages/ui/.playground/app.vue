<template>
  <PUIBase>
    <div class="container">
      <NuxtPage />
    </div>
  </PUIBase>
</template>

<script lang="ts" setup>
useHead({
  title: 'Pruvious UI',
})
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
</style>
