import { defineCollection } from '#pruvious'

export default defineCollection({
  name: 'image-fields',
  mode: 'multi',
  createdAtField: false,
  updatedAtField: false,
  fields: {
    regular: {
      type: 'image',
      options: {},
    },
    required: {
      type: 'image',
      options: {
        required: true,
      },
    },
    png: {
      type: 'image',
      options: {
        allowedTypes: ['PNG'],
      },
    },
    minW9001: {
      type: 'image',
      options: {
        minWidth: 9001,
      },
    },
    optimized: {
      type: 'image',
      options: {
        sources: [
          { media: '(max-width: 768px)', format: 'webp', width: 1024, height: 1024, resize: 'cover' },
          { media: '(max-width: 768px)', format: 'jpeg', width: 1024, height: 1024, resize: 'cover' },
          { format: 'webp', width: 1600, height: 1600, resize: 'contain' },
          { format: 'jpeg', width: 1600, height: 1600, resize: 'contain' },
        ],
      },
    },
  },
})
