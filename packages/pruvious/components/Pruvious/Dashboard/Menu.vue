<template>
  <div class="p-menu">
    <PruviousDashboardMenuGeneral />
    <PruviousDashboardMenuCollections />
    <PruviousDashboardMenuManagement />
    <PruviousDashboardMenuUtilities />
  </div>
</template>

<style scoped>
.p-menu > * + * {
  margin-top: 1.5em;
}
</style>
