<template>
  <figure class="image-block">
    <p v-if="!image" class="image-block-empty">
      Select an image to preview &lt;PruviousPicture /&gt; and &lt;PruviousImage /&gt;.
    </p>

    <template v-else>
      <section>
        <h3>&lt;PruviousPicture /&gt; with variants</h3>
        <PruviousPicture
          :image="image"
          :img-attrs="{ class: 'rounded-image', style: 'border: 2px solid #6b7280;' }"
          :sources="[
            { variant: 'mobile', media: '(max-width: 768px)' },
            { variant: 'square', media: '(max-width: 1280px)' },
            'desktop',
          ]"
        />
      </section>

      <section>
        <h3>&lt;PruviousImage /&gt; (thumbnail variant)</h3>
        <PruviousImage :image="image" variant="thumbnail" />
      </section>

      <section>
        <h3>&lt;PruviousImage /&gt; (original)</h3>
        <PruviousImage :image="image" />
      </section>

      <figcaption v-if="caption">{{ caption }}</figcaption>
    </template>
  </figure>
</template>

<script lang="ts" setup>
import { defineBlock, imageField, textField } from '#pruvious/app'

defineBlock({
  ui: { icon: 'photo' },
})

defineProps({
  image: imageField({
    fields: ['id', 'path', 'mime', 'imageWidth', 'imageHeight', 'description'],
    populate: true,
  }),
  caption: textField({
    ui: { label: 'Caption' },
  }),
})
</script>

<style scoped>
.image-block {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 0;
}

.image-block section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.image-block h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
}

.image-block :deep(picture),
.image-block :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
}

.image-block-empty {
  margin: 0;
  padding: 2rem;
  background: #f3f4f6;
  border: 1px dashed #d1d5db;
  border-radius: 0.5rem;
  text-align: center;
  color: #6b7280;
}

figcaption {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.image-block :deep(.rounded-image) {
  border-radius: 0.75rem;
}
</style>
