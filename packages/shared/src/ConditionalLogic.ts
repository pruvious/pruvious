import { clearObject, resolvePath } from '@pruvious-test/utils'
import dayjs from 'dayjs'
import { getDefaultFieldValue } from './fields'
import {
  AndCondition,
  Block,
  Condition,
  ExtendedTabbedFieldLayout,
  Field,
  FieldGroup,
  OrCondition,
  RedirectionTestField,
} from './types'
import { walkBlockFields, walkFields } from './walker'

export class ConditionalLogic {
  matches: Record<string, boolean> = {}

  fieldMap: Record<string, any> = {}

  recordsMap: Record<string, { field: Field; records: Record<string, any> }> = {}

  conditionMap: Record<string, Record<string, Condition> | OrCondition | AndCondition> = {}

  constructor(
    protected records: Record<string, any>,
    protected fields: (Field | FieldGroup)[],
    protected blocks?: Block[],
  ) {
    this.check()
  }

  setRecords(records: Record<string, any>) {
    this.records = records
    return this
  }

  setFields(fields: (Field | FieldGroup | ExtendedTabbedFieldLayout | RedirectionTestField)[]) {
    this.fields = fields.filter((field) => {
      return field.type !== 'redirectionTest'
    }) as (Field | FieldGroup)[]

    return this
  }

  setBlocks(blocks?: Block[]) {
    this.blocks = blocks
    return this
  }

  check() {
    clearObject(this.fieldMap)
    clearObject(this.conditionMap)

    for (const { field, key, value, records } of walkFields(this.records, this.fields)) {
      if (field.type === 'date' && typeof value === 'string') {
        const date = dayjs(value)
        this.fieldMap[key] = date
          .subtract(date.get('hours'), 'hours')
          .subtract(date.get('minutes'), 'minutes')
          .subtract(date.get('seconds'), 'seconds')
          .subtract(date.get('milliseconds'), 'milliseconds')
          .toDate()
          .getTime()
      } else if (field.type === 'dateTime' && typeof value === 'string') {
        const date = dayjs(value)
        this.fieldMap[key] = field.utc
          ? date
              .subtract(date.utcOffset() * 60000)
              .toDate()
              .getTime()
          : date.toDate().getTime()
      } else if (field.type === 'time' && typeof value === 'string') {
        const date = dayjs(value).toDate()
        this.fieldMap[key] =
          (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) * 1000 +
          date.getUTCMilliseconds()
      } else {
        this.fieldMap[key] = value
      }

      if (field.condition) {
        this.recordsMap[key] = { field, records }
        this.conditionMap[key] = JSON.parse(JSON.stringify(field.condition))
      } else {
        this.matches[key] = true
      }
    }

    if (this.blocks) {
      for (const { field, key, value, records } of walkBlockFields(
        this.records.blocks ?? [],
        this.blocks,
        'blocks',
      )) {
        this.fieldMap[key] = value

        if (field.condition) {
          this.recordsMap[key] = { field, records }
          this.conditionMap[key] = JSON.parse(JSON.stringify(field.condition))
        } else {
          this.matches[key] = true
        }
      }
    }

    Object.keys(this.conditionMap).forEach((key) => {
      this.conditionMap[key] = this.prepareCondition(this.conditionMap[key], key)
    })

    Object.entries(this.conditionMap).forEach(([key, condition]) => {
      let parentKey = key
      let parentsMatches: boolean = true

      while (true) {
        if (parentKey !== key && this.matches[parentKey] === false) {
          parentsMatches = false
          break
        }

        if (parentKey.includes('.')) {
          parentKey = parentKey.slice(0, parentKey.lastIndexOf('.'))
        } else {
          break
        }
      }

      this.matches[key] = parentsMatches && this.match(condition)

      if (this.matches[key] && this.recordsMap[key] && this.fieldMap[key] === null) {
        this.recordsMap[key].records[this.recordsMap[key].field.name] = getDefaultFieldValue(
          this.recordsMap[key].field,
        )
      }
    })
  }

  protected prepareCondition(
    condition: Record<string, Condition> | OrCondition | AndCondition,
    key: string,
  ): Record<string, Condition> | OrCondition | AndCondition {
    for (const [_key, value] of Object.entries(condition)) {
      if (_key === '$and' || _key === '$or') {
        for (const _condition of value) {
          this.prepareCondition(_condition, key)
        }
      } else {
        const resolvedKey = resolvePath(
          _key
            .replace(/#/g, '~')
            .replace(/\.([0-9]+)\./g, '/$1/')
            .replace(/([a-z0-9])\./g, '$1/'),
          key
            .replace(/#/g, '~')
            .replace(/\.([0-9]+)\./g, '/$1/')
            .replace(/([a-z0-9])\./g, '$1/'),
        )
          .slice(1)
          .replace(/~/g, '#')
          .replace(/-([0-9]+)-/g, '.$1.')
          .replace(/\//g, '.')

        delete condition[_key]

        condition[resolvedKey] = value
      }
    }

    return condition
  }

  protected match(condition: Record<string, Condition> | OrCondition | AndCondition): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (key === '$and') {
        for (const _condition of value) {
          if (!this.match(_condition)) {
            return false
          }
        }

        return true
      } else if (key === '$or') {
        for (const _condition of value) {
          if (this.match(_condition)) {
            return true
          }
        }

        return false
      } else {
        const matchValue = this.fieldMap[key]

        if (value.$eq !== undefined) {
          return typeof value.$eq === 'object'
            ? JSON.stringify(matchValue) === JSON.stringify(value.$eq)
            : matchValue === value.$eq
        } else if (typeof value.$eqi === 'string' && typeof matchValue === 'string') {
          return matchValue.toLowerCase() === value.$eqi.toLowerCase()
        } else if (value.$ne !== undefined) {
          return typeof value.$ne === 'object'
            ? JSON.stringify(matchValue) !== JSON.stringify(value.$ne)
            : matchValue !== value.$ne
        } else if (typeof value.$lt === 'number' && typeof matchValue === 'number') {
          return matchValue < value.$lt
        } else if (
          typeof value.$lt === 'number' &&
          (typeof matchValue === 'string' || Array.isArray(matchValue))
        ) {
          return matchValue.length < value.$lt
        } else if (typeof value.$lte === 'number' && typeof matchValue === 'number') {
          return matchValue <= value.$lte
        } else if (
          typeof value.$lte === 'number' &&
          (typeof matchValue === 'string' || Array.isArray(matchValue))
        ) {
          return matchValue.length <= value.$lte
        } else if (typeof value.$gt === 'number' && typeof matchValue === 'number') {
          return matchValue > value.$gt
        } else if (
          typeof value.$gt === 'number' &&
          (typeof matchValue === 'string' || Array.isArray(matchValue))
        ) {
          return matchValue.length > value.$gt
        } else if (typeof value.$gte === 'number' && typeof matchValue === 'number') {
          return matchValue >= value.$gte
        } else if (
          typeof value.$gte === 'number' &&
          (typeof matchValue === 'string' || Array.isArray(matchValue))
        ) {
          return matchValue.length >= value.$gte
        } else if (Array.isArray(value.$in)) {
          return value.$in.includes(matchValue)
        } else if (Array.isArray(value.$notIn)) {
          return value.$notIn.includes(matchValue)
        } else if (value.$null !== undefined) {
          return matchValue === null
        } else if (value.$notNull !== undefined) {
          return matchValue !== null
        } else if (
          Array.isArray(value.$between) &&
          value.$between.length === 2 &&
          value.$between.every((el: any) => typeof el === 'number')
        ) {
          if (typeof matchValue === 'number') {
            return matchValue >= value.$between[0] && matchValue <= value.$between[1]
          } else if (typeof matchValue === 'string' || Array.isArray(matchValue)) {
            return matchValue.length >= value.$between[0] && matchValue.length <= value.$between[1]
          }
        } else if (typeof value.$startsWith === 'string' && typeof matchValue === 'string') {
          return matchValue.toLowerCase().startsWith(value.$startsWith.toLowerCase())
        } else if (typeof value.$startsWith === 'string' && Array.isArray(matchValue)) {
          return matchValue[0] === value.$startsWith
        } else if (typeof value.$endsWith === 'string' && typeof matchValue === 'string') {
          return matchValue.toLowerCase().endsWith(value.$endsWith.toLowerCase())
        } else if (typeof value.$endsWith === 'string' && Array.isArray(matchValue)) {
          return matchValue[matchValue.length - 1] === value.$endsWith
        } else if (typeof value.$contains === 'string' && typeof matchValue === 'string') {
          return matchValue.toLowerCase().includes(value.$contains.toLowerCase())
        } else if (typeof value.$contains === 'string' && Array.isArray(matchValue)) {
          return matchValue.includes(value.$contains)
        } else if (value.$regex !== undefined) {
          try {
            const regex =
              typeof value.$regex === 'string'
                ? new RegExp(value.$regex)
                : new RegExp(value.$regex[0], value.$regex[1])
            return regex.test(matchValue.toString())
          } catch (_) {}
        }

        return false
      }
    }

    return true
  }
}
