<template>
  <NuxtLink
    :rel="link?.target === '_blank' ? 'nofollow noopener noreferrer' : null"
    :target="link?.target"
    :to="link?.path || link?.url"
  >
    <slot>{{ link?.label }}</slot>
  </NuxtLink>
</template>

<script lang="ts" setup>
import { linkField } from '#imports';

defineProps({
  link: linkField(),
})
</script>
