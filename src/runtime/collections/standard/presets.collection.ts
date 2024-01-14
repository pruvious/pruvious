import { uniqueValidator } from '../../validators/unique'
import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'presets',
  mode: 'multi',
  search: {
    default: [
      { field: 'name', reserve: 160 },
      { field: 'blocks', fieldValueType: 'populated' },
    ],
  },
  translatable: true,
  contentBuilder: {
    blocksField: 'blocks',
  },
  dashboard: {
    icon: 'Transform',
    primaryField: 'name',
    overviewTable: {
      columns: [{ field: 'name', width: 72.9 }, 'createdAt', 'updatedAt'],
    },
  },
  fields: {
    /*
    |--------------------------------------------------------------------------
    | name
    |--------------------------------------------------------------------------
    |
    */
    name: {
      type: 'text',
      options: {
        label: 'Name',
        required: true,
      },
      additional: {
        unique: 'perLanguage',
        validators: [
          (context) =>
            uniqueValidator(
              context,
              context.__(context.language, 'pruvious-server', 'A preset with this name already exists'),
            ),
        ],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | blocks
    |--------------------------------------------------------------------------
    |
    */
    blocks: {
      type: 'repeater',
      options: {
        label: 'Blocks',
        description: 'The blocks that make up the preset content.',
        subfields: {
          block: {
            type: 'block',
            options: {
              label: 'Block',
            },
          },
        },
        addLabel: 'Add block',
      },
    },
  },
})
