import {
  defineCollection,
  fileField,
  filesField,
  imageField,
  imagesField,
  recordField,
  recordsField,
  repeaterField,
} from '#pruvious/server'

export default defineCollection({
  fields: {
    // fileField
    file: fileField({
      ui: { label: 'File' },
    }),
    fileCasted: fileField({
      fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
      populate: false,
      ui: { label: 'File (casted)' },
    }),
    fileAllowedTypesMime: fileField({
      allowedTypes: ['text/plain'],
      ui: { label: 'File (allowed types - MIME)', selectLabel: 'Select a text file' },
    }),
    fileAllowedTypesCategory: fileField({
      allowedTypes: 'image',
      ui: { label: 'File (allowed types - category)', selectLabel: 'Select an image' },
    }),
    fileMinSize: fileField({
      minSize: '1 KB',
      ui: { label: 'File (min size)', description: 'Minimum size: 1 KB' },
    }),
    fileMaxSize: fileField({
      maxSize: '1 KB',
      ui: { label: 'File (max size)', description: 'Maximum size: 1 KB' },
    }),

    // filesField
    files: filesField({
      ui: { label: 'Files', placeholder: 'Select files' },
    }),
    filesCasted: filesField({
      fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
      populate: false,
      ui: { label: 'Files (casted)' },
    }),
    filesMinMax: filesField({
      minItems: 0,
      maxItems: 1,
      ui: { label: 'Files (min/max)' },
    }),
    filesAllowedTypesMime: filesField({
      allowedTypes: ['text/plain'],
      ui: { label: 'Files (allowed types - MIME)', placeholder: 'Select text files' },
    }),
    filesAllowedTypesCategory: filesField({
      allowedTypes: 'image',
      ui: { label: 'Files (allowed types - category)', placeholder: 'Select images' },
    }),
    filesMinSize: filesField({
      minSize: '1 KB',
      ui: { label: 'Files (min size)', description: 'Minimum size: 1 KB' },
    }),
    filesMaxSize: filesField({
      maxSize: '1 KB',
      ui: { label: 'Files (max size)', description: 'Maximum size: 1 KB' },
    }),
    filesRepeater: repeaterField({
      subfields: {
        files: filesField({
          ui: { label: 'Files', placeholder: 'Select files' },
        }),
      },
      ui: { label: 'Files (in repeater)' },
    }),
    filesRepeaterCasted: repeaterField({
      subfields: {
        files: filesField({
          fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
          populate: false,
          ui: { label: 'Files (casted)' },
        }),
      },
      ui: { label: 'Files (in repeater, casted)' },
    }),
    filesRepeaterMinMax: repeaterField({
      subfields: {
        files: filesField({
          minItems: 0,
          maxItems: 1,
          ui: { label: 'Files (min/max)' },
        }),
      },
      ui: { label: 'Files (in repeater, min/max)' },
    }),
    filesRepeaterAllowedTypesMime: repeaterField({
      subfields: {
        files: filesField({
          allowedTypes: ['text/plain'],
          ui: { label: 'Files (allowed types - MIME)', placeholder: 'Select text files' },
        }),
      },
      ui: { label: 'Files (in repeater, allowed types - MIME)' },
    }),
    filesRepeaterAllowedTypesCategory: repeaterField({
      subfields: {
        files: filesField({
          allowedTypes: 'image',
          ui: { label: 'Files (allowed types - category)', placeholder: 'Select images' },
        }),
      },
      ui: { label: 'Files (in repeater, allowed types - category)' },
    }),
    filesRepeaterMinSize: repeaterField({
      subfields: {
        files: filesField({
          minSize: '1 KB',
          ui: { label: 'Files (min size)', description: 'Minimum size: 1 KB' },
        }),
      },
      ui: { label: 'Files (in repeater, min size)' },
    }),
    filesRepeaterMaxSize: repeaterField({
      subfields: {
        files: filesField({
          maxSize: '1 KB',
          ui: { label: 'Files (max size)', description: 'Maximum size: 1 KB' },
        }),
      },
      ui: { label: 'Files (in repeater, max size)' },
    }),

    // imageField
    image: imageField({
      ui: { label: 'Image', dataTable: { showThumbnail: false } },
    }),
    imageCasted: imageField({
      fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
      populate: false,
      ui: { label: 'Image (casted)' },
    }),
    imageAllowedTypesMime: imageField({
      allowedTypes: ['image/png'],
      ui: { label: 'Image (allowed types - MIME)', selectLabel: 'Select a PNG image' },
    }),
    imageMinSize: imageField({
      minSize: '5 KB',
      ui: { label: 'Image (min size)', description: 'Minimum size: 5 KB' },
    }),
    imageMaxSize: imageField({
      maxSize: '5 KB',
      ui: { label: 'Image (max size)', description: 'Maximum size: 5 KB' },
    }),
    imageMinWidth: imageField({
      minWidth: 100,
      ui: { label: 'Image (min width)', description: 'Minimum width: 100px' },
    }),
    imageMaxWidth: imageField({
      maxWidth: 100,
      ui: { label: 'Image (max width)', description: 'Maximum width: 100px' },
    }),
    imageMinHeight: imageField({
      minHeight: 100,
      ui: { label: 'Image (min height)', description: 'Minimum height: 100px' },
    }),
    imageMaxHeight: imageField({
      maxHeight: 100,
      ui: { label: 'Image (max height)', description: 'Maximum height: 100px' },
    }),

    // imagesField
    images: imagesField({
      ui: { label: 'Images', placeholder: 'Select images', dataTable: { showThumbnails: false } },
    }),
    imagesCasted: imagesField({
      fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
      populate: false,
      ui: { label: 'Images (casted)' },
    }),
    imagesMinMax: imagesField({
      minItems: 0,
      maxItems: 1,
      ui: { label: 'Images (min/max)' },
    }),
    imagesAllowedTypesMime: imagesField({
      allowedTypes: ['image/png'],
      ui: { label: 'Images (allowed types - MIME)', placeholder: 'Select PNG images' },
    }),
    imagesMinSize: imagesField({
      minSize: '5 KB',
      ui: { label: 'Images (min size)', description: 'Minimum size: 5 KB' },
    }),
    imagesMaxSize: imagesField({
      maxSize: '5 KB',
      ui: { label: 'Images (max size)', description: 'Maximum size: 5 KB' },
    }),
    imagesMinWidth: imagesField({
      minWidth: 100,
      ui: { label: 'Images (min width)', description: 'Minimum width: 100px' },
    }),
    imagesMaxWidth: imagesField({
      maxWidth: 100,
      ui: { label: 'Images (max width)', description: 'Maximum width: 100px' },
    }),
    imagesMinHeight: imagesField({
      minHeight: 100,
      ui: { label: 'Images (min height)', description: 'Minimum height: 100px' },
    }),
    imagesMaxHeight: imagesField({
      maxHeight: 100,
      ui: { label: 'Images (max height)', description: 'Maximum height: 100px' },
    }),
    imagesRepeater: repeaterField({
      subfields: {
        images: imagesField({
          ui: { label: 'Images', placeholder: 'Select images' },
        }),
      },
      ui: { label: 'Images (in repeater)' },
    }),
    imagesRepeaterCasted: repeaterField({
      subfields: {
        images: imagesField({
          fields: ['id', 'path', 'author', 'description', 'images', 'isLocked'],
          populate: false,
          ui: { label: 'Images (casted)' },
        }),
      },
      ui: { label: 'Images (in repeater, casted)' },
    }),
    imagesRepeaterMinMax: repeaterField({
      subfields: {
        images: imagesField({
          minItems: 0,
          maxItems: 1,
          ui: { label: 'Images (min/max)' },
        }),
      },
      ui: { label: 'Images (in repeater, min/max)' },
    }),
    imagesRepeaterAllowedTypesMime: repeaterField({
      subfields: {
        images: imagesField({
          allowedTypes: ['image/png'],
          ui: { label: 'Images (allowed types - MIME)', placeholder: 'Select PNG images' },
        }),
      },
      ui: { label: 'Images (in repeater, allowed types - MIME)' },
    }),
    imagesRepeaterMinSize: repeaterField({
      subfields: {
        images: imagesField({
          minSize: '5 KB',
          ui: { label: 'Images (min size)', description: 'Minimum size: 5 KB' },
        }),
      },
      ui: { label: 'Images (in repeater, min size)' },
    }),
    imagesRepeaterMaxSize: repeaterField({
      subfields: {
        images: imagesField({
          maxSize: '5 KB',
          ui: { label: 'Images (max size)', description: 'Maximum size: 5 KB' },
        }),
      },
      ui: { label: 'Images (in repeater, max size)' },
    }),
    imagesRepeaterMinWidth: repeaterField({
      subfields: {
        images: imagesField({
          minWidth: 100,
          ui: { label: 'Images (min width)', description: 'Minimum width: 100px' },
        }),
      },
      ui: { label: 'Images (in repeater, min width)' },
    }),
    imagesRepeaterMaxWidth: repeaterField({
      subfields: {
        images: imagesField({
          maxWidth: 100,
          ui: { label: 'Images (max width)', description: 'Maximum width: 100px' },
        }),
      },
      ui: { label: 'Images (in repeater, max width)' },
    }),
    imagesRepeaterMinHeight: repeaterField({
      subfields: {
        images: imagesField({
          minHeight: 100,
          ui: { label: 'Images (min height)', description: 'Minimum height: 100px' },
        }),
      },
      ui: { label: 'Images (in repeater, min height)' },
    }),
    imagesRepeaterMaxHeight: repeaterField({
      subfields: {
        images: imagesField({
          maxHeight: 100,
          ui: { label: 'Images (max height)', description: 'Maximum height: 100px' },
        }),
      },
      ui: { label: 'Images (in repeater, max height)' },
    }),

    // record
    record: recordField({
      collection: 'Users',
      ui: {
        description: 'Select a user',
        placeholder: 'Select a user',
        displayFields: [['firstName', ' ', 'lastName'], 'email'],
        searchFields: ['firstName', 'lastName', 'email'],
      },
    }),
    recordPopulate: recordField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      populate: true,
      ui: {
        label: 'Record (populate)',
        displayFields: 'lastName',
        searchFields: 'lastName',
      },
    }),

    // records
    records: recordsField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      ui: {
        description: 'Select users',
        placeholder: 'Select users',
        displayFields: [['firstName', ' ', 'lastName'], 'email'],
        searchFields: ['firstName', 'lastName', 'email'],
      },
    }),
    recordsMinMax: recordsField({
      collection: 'Users',
      minItems: 2,
      maxItems: 3,
      default: [1, 2],
      ui: {
        label: 'Records (min/max)',
        displayFields: 'lastName',
        searchFields: 'lastName',
      },
    }),
    recordsPopulate: recordsField({
      collection: 'Users',
      fields: ['id', 'email', 'roles'],
      populate: true,
      ui: { label: 'Records (populate)' },
    }),
    recordsRepeater: repeaterField({
      subfields: {
        records: recordsField({
          collection: 'Users',
          fields: ['id', 'email', 'roles'],
          ui: {
            description: 'Select users',
            placeholder: 'Select users',
            displayFields: [['firstName', ' ', 'lastName'], 'email'],
            searchFields: ['firstName', 'lastName', 'email'],
          },
        }),
      },
      ui: { label: 'Records (in repeater)' },
    }),
    recordsRepeaterMinMax: repeaterField({
      subfields: {
        records: recordsField({
          collection: 'Users',
          minItems: 2,
          maxItems: 3,
          default: [1, 2],
          ui: {
            label: 'Records (min/max)',
            displayFields: 'lastName',
            searchFields: 'lastName',
          },
        }),
      },
      ui: { label: 'Records (in repeater, min/max)' },
    }),
    recordsRepeaterPopulate: repeaterField({
      subfields: {
        records: recordsField({
          collection: 'Users',
          fields: ['id', 'email', 'roles'],
          populate: true,
          ui: { label: 'Record (populate)' },
        }),
      },
      ui: { label: 'Records (in repeater, populate)' },
    }),
  },
  translatable: false,
  createdAt: false,
  updatedAt: false,
  ui: {
    createPage: {
      fieldsLayout: [
        {
          tabs: [
            {
              label: 'File',
              fields: [
                'file',
                'fileCasted',
                'fileAllowedTypesMime',
                'fileAllowedTypesCategory',
                'fileMinSize',
                'fileMaxSize',
              ],
            },
            {
              label: 'Files',
              fields: [
                'files',
                'filesCasted',
                'filesMinMax',
                'filesAllowedTypesMime',
                'filesAllowedTypesCategory',
                'filesMinSize',
                'filesMaxSize',
                'filesRepeater',
                'filesRepeaterCasted',
                'filesRepeaterMinMax',
                'filesRepeaterAllowedTypesMime',
                'filesRepeaterAllowedTypesCategory',
                'filesRepeaterMinSize',
                'filesRepeaterMaxSize',
              ],
            },
            {
              label: 'Image',
              fields: [
                'image',
                'imageCasted',
                'imageAllowedTypesMime',
                'imageMinSize',
                'imageMaxSize',
                'imageMinWidth',
                'imageMaxWidth',
                'imageMinHeight',
                'imageMaxHeight',
              ],
            },
            {
              label: 'Images',
              fields: [
                'images',
                'imagesCasted',
                'imagesMinMax',
                'imagesAllowedTypesMime',
                'imagesMinSize',
                'imagesMaxSize',
                'imagesMinWidth',
                'imagesMaxWidth',
                'imagesMinHeight',
                'imagesMaxHeight',
                'imagesRepeater',
                'imagesRepeaterCasted',
                'imagesRepeaterMinMax',
                'imagesRepeaterAllowedTypesMime',
                'imagesRepeaterMinSize',
                'imagesRepeaterMaxSize',
                'imagesRepeaterMinWidth',
                'imagesRepeaterMaxWidth',
                'imagesRepeaterMinHeight',
                'imagesRepeaterMaxHeight',
              ],
            },
            {
              label: 'Record',
              fields: ['record', 'recordPopulate'],
            },
            {
              label: 'Records',
              fields: [
                'records',
                'recordsMinMax',
                'recordsPopulate',
                'recordsRepeater',
                'recordsRepeaterMinMax',
                'recordsRepeaterPopulate',
              ],
            },
          ],
        },
      ],
    },
    updatePage: { fieldsLayout: 'mirror' },
  },
})
