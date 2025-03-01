import { Collection, createdAtField, Field, numberFieldModel, textFieldModel } from '@pruvious/orm'
import { privateCollectionMeta } from '../collections/meta'

export const cacheCollection = new Collection({
  fields: {
    key: new Field({
      model: textFieldModel(),
      required: true,
      nullable: false,
      options: {},
    }),
    value: new Field({
      model: textFieldModel(),
      required: true,
      nullable: false,
      options: {},
    }),
    expiresAt: new Field({
      model: numberFieldModel(),
      options: {},
    }),
    createdAt: createdAtField(),
  },
  indexes: [{ fields: ['key'], unique: true }, { fields: ['key', 'expiresAt'] }],
  meta: privateCollectionMeta,
})
