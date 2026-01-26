import { defineCollection, localPathField } from '#pruvious/server'

export default defineCollection({
  fields: {
    localPath: localPathField({ initialDirectory: '~' }),
    localPathFile: localPathField({
      selectionType: 'file',
      ui: { selectLabel: ({ __ }) => __('pruvious-dashboard', 'Please select a file') },
    }),
    localPathDirectory: localPathField({
      selectionType: 'directory',
      ui: { selectLabel: ({ __ }) => __('pruvious-dashboard', 'Please select a directory') },
    }),
  },
})
