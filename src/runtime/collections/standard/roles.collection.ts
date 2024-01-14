import { userCapabilities } from '#pruvious/preflight'
import { titleCase } from '../../utils/string'
import { uniqueValidator } from '../../validators/unique'
import { defineCollection } from '../collection.definition'

export default defineCollection({
  name: 'roles',
  mode: 'multi',
  search: { default: [{ field: 'name', reserve: 60 }, 'capabilities'] },
  dashboard: {
    icon: 'Shield',
    primaryField: 'name',
  },
  fields: {
    name: {
      type: 'text',
      options: {
        label: 'Role name',
        description: 'A unique role name.',
        required: true,
      },
      additional: {
        unique: 'perLanguage',
        validators: [uniqueValidator],
      },
    },
    capabilities: {
      type: 'chips',
      options: {
        label: 'Role capabilities',
        description: 'List of capabilities assigned to this role. Users with this role inherit these capabilities.',
        placeholder: 'Add capability',
        choices: Object.fromEntries(
          userCapabilities.map((capability) => [
            capability,
            capability.startsWith('collection-')
              ? titleCase(
                  capability.replace(
                    /^collection-([a-z0-9-]+)-(create-many|read-many|update-many|delete-many|create|read|update|delete)$/i,
                    '$2-$1',
                  ),
                  false,
                )
              : titleCase(capability, false),
          ]),
        ),
        overrideType: 'UserCapability[]',
        tooltips: true,
        sortable: true,
      },
    },
  },
})
