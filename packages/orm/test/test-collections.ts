import { isDefined } from '@pruvious/utils'
import {
  bigIntFieldModel,
  booleanFieldModel,
  Collection,
  createdAtField,
  Field,
  matrixFieldModel,
  numberFieldModel,
  textFieldModel,
  uniqueValidator,
  updatedAtField,
} from '../src'

export const Houses = new Collection({
  fields: {
    name: new Field({
      model: textFieldModel(),
      options: {},
      nullable: false,
      required: true,
      validators: [uniqueValidator('The house already exists')],
    }),
    founder: new Field({
      model: textFieldModel(),
      options: {},
    }),
    points: new Field({
      model: numberFieldModel(),
      options: {
        min: 0,
      },
    }),
    createdAt: createdAtField(),
    updatedAt: updatedAtField(),
  },
  indexes: [{ fields: ['name'], unique: true }],
  hooks: {
    beforeQueryExecution: [
      async (context) => {
        if (context.operation === 'delete') {
          const hogwartsHouses = await context.database
            .queryBuilder()
            .selectFrom(context.collectionName!)
            .setWhereCondition(context.whereCondition)
            .where('name', 'in', ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'])
            .useCache(context.cache)
            .count()

          if (hogwartsHouses.success) {
            if (hogwartsHouses.data > 0) {
              throw new Error('You cannot delete a Hogwarts house')
            }
          } else if (hogwartsHouses.runtimeError) {
            throw new Error(hogwartsHouses.runtimeError)
          } else {
            throw new Error('An error occurred while checking if the house is a Hogwarts house')
          }
        }
      },
    ],
  },
})

export const Clubs = new Collection({
  fields: {
    name: new Field({
      model: textFieldModel(),
      options: {},
      nullable: false,
      required: true,
      validators: [uniqueValidator('The club already exists')],
    }),
  },
  indexes: [{ fields: ['name'], unique: true }],
})

export const Students = new Collection({
  fields: {
    firstName: new Field({
      model: textFieldModel(),
      options: {},
      nullable: false,
      required: true,
      validators: [
        (value) => {
          if (value === 'Voldemort') {
            throw new Error('You know who')
          }
        },
        async (value, { context }) => {
          if (value === 'Tom') {
            if (context.operation === 'insert') {
              if (context.getSanitizedInputValue('lastName') === 'Riddle') {
                throw new Error('You know who')
              }
            } else if (context.operation === 'update') {
              const lastName = context.getSanitizedInputValue('lastName')

              if (isDefined(lastName)) {
                if (lastName === 'Riddle') {
                  throw new Error('You know who')
                }
              } else {
                const { data } = await context.database
                  .queryBuilder()
                  .selectFrom(context.collectionName!)
                  .select('lastName')
                  .setWhereCondition(context.whereCondition)
                  .where('lastName', '=', 'Riddle')
                  .count()

                if (data! > 0) {
                  throw new Error('You know who')
                }
              }
            }
          }
        },
        uniqueValidator(['firstName', 'lastName'], 'A student with identical first and last names already exists'),
      ],
    }),
    middleName: new Field({
      model: textFieldModel(),
      options: {},
    }),
    lastName: new Field({
      model: textFieldModel(),
      options: {},
      nullable: false,
      required: true,
      validators: [
        (value) => {
          if (value === 'Voldemort') {
            throw new Error('You know who')
          }
        },
        async (value, { context }) => {
          if (value === 'Riddle') {
            if (context.operation === 'insert') {
              if (context.getSanitizedInputValue('firstName') === 'Tom') {
                throw new Error('You know who')
              }
            } else if (context.operation === 'update') {
              const firstName = context.getSanitizedInputValue('firstName')

              if (isDefined(firstName)) {
                if (firstName === 'Tom') {
                  throw new Error('You know who')
                }
              } else {
                const { data } = await context.database
                  .queryBuilder()
                  .selectFrom(context.collectionName!)
                  .select('firstName')
                  .setWhereCondition(context.whereCondition)
                  .where('firstName', '=', 'Tom')
                  .count()

                if (data! > 0) {
                  throw new Error('You know who')
                }
              }
            }
          }
        },
        uniqueValidator(['firstName', 'lastName'], 'A student with identical first and last names already exists'),
      ],
    }),
    house: new Field({
      model: bigIntFieldModel<number, Pick<(typeof Houses)['TPopulatedTypes'], 'name'> | null>(),
      options: {
        min: 1,
        populator: async (value, { context }) => {
          if (value) {
            const house = await context.database
              .queryBuilder()
              .selectFrom('Houses')
              .select('name')
              .where('id', '=', value)
              .useCache(context.cache)
              .first()

            if (house.success) {
              return house.data
            }
          }

          return null
        },
      },
      default: null,
      validators: [
        async (value, { context }) => {
          if (value) {
            const { data } = await context.database.queryBuilder().selectFrom('Houses').where('id', '=', value).count()

            if (data === 0) {
              throw new Error('The house does not exist')
            }
          }
        },
      ],
    }),
    prefect: new Field({
      model: booleanFieldModel(),
      options: {},
      nullable: false,
    }),
    clubs: new Field({
      model: matrixFieldModel(),
      options: {},
      nullable: false,
    }),
  },
  indexes: [{ fields: ['firstName', 'lastName'], unique: true }],
  foreignKeys: [{ field: 'house', referencedCollection: 'Houses' }],
})

export const collections = { Houses, Clubs, Students }
