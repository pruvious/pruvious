import { describe, expect, it } from 'vitest'
import { arrayOrNullValidator, arrayValidator } from '../src/runtime/validators/array'
import { booleanOrNullValidator, booleanValidator } from '../src/runtime/validators/boolean'
import {
  integerOrNullValidator,
  integerValidator,
  numberOrNullValidator,
  numberValidator,
  positiveIntegerOrNullValidator,
  positiveIntegerValidator,
} from '../src/runtime/validators/number'
import { objectOrNullValidator, objectValidator } from '../src/runtime/validators/object'
import { presentValidator } from '../src/runtime/validators/present'
import { requiredValidator } from '../src/runtime/validators/required'
import {
  emailValidator,
  lowercaseValidator,
  stringOrNullValidator,
  stringValidator,
} from '../src/runtime/validators/string'

const ctx: any = {
  __: (_: string, __: string, message: string) => message,
  language: 'en',
}

/*
|--------------------------------------------------------------------------
| array
|--------------------------------------------------------------------------
|
*/
describe('array validator', () => {
  it('validates arrays', () => {
    expect(arrayValidator({ value: [1, 2, 3] })).toBeUndefined()
    expect(arrayValidator({ value: [] })).toBeUndefined()
    expect(() => arrayValidator({ value: null })).toThrowError()
    expect(() => arrayValidator({ value: undefined })).toThrowError()
    expect(() => arrayValidator({ value: {} })).toThrowError()
    expect(() => arrayValidator({ value: 1 })).toThrowError()
  })

  it('validates arrays or nulls', () => {
    expect(arrayOrNullValidator({ value: [1, 2, 3] })).toBeUndefined()
    expect(arrayOrNullValidator({ value: [] })).toBeUndefined()
    expect(arrayOrNullValidator({ value: null })).toBeUndefined()
    expect(() => arrayOrNullValidator({ value: undefined })).toThrowError()
    expect(() => arrayOrNullValidator({ value: {} })).toThrowError()
    expect(() => arrayOrNullValidator({ value: 1 })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => arrayValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => arrayOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| boolean
|--------------------------------------------------------------------------
|
*/
describe('boolean validator', () => {
  it('validates booleans', () => {
    expect(booleanValidator({ value: true })).toBeUndefined()
    expect(booleanValidator({ value: false })).toBeUndefined()
    expect(() => booleanValidator({ value: null })).toThrowError()
    expect(() => booleanValidator({ value: undefined })).toThrowError()
    expect(() => booleanValidator({ value: {} })).toThrowError()
    expect(() => booleanValidator({ value: 1 })).toThrowError()
    expect(() => booleanValidator({ value: 0 })).toThrowError()
  })

  it('validates booleans or nulls', () => {
    expect(booleanOrNullValidator({ value: true })).toBeUndefined()
    expect(booleanOrNullValidator({ value: false })).toBeUndefined()
    expect(booleanOrNullValidator({ value: null })).toBeUndefined()
    expect(() => booleanOrNullValidator({ value: undefined })).toThrowError()
    expect(() => booleanOrNullValidator({ value: {} })).toThrowError()
    expect(() => booleanOrNullValidator({ value: 1 })).toThrowError()
    expect(() => booleanOrNullValidator({ value: 0 })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => booleanValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => booleanOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| number
|--------------------------------------------------------------------------
|
*/
describe('number validator', () => {
  it('validates real numbers', () => {
    expect(numberValidator({ value: 1 })).toBeUndefined()
    expect(numberValidator({ value: 0 })).toBeUndefined()
    expect(numberValidator({ value: 1.5 })).toBeUndefined()
    expect(numberValidator({ value: -1 })).toBeUndefined()
    expect(() => numberValidator({ value: null })).toThrowError()
    expect(() => numberValidator({ value: Infinity })).toThrowError()
    expect(() => numberValidator({ value: NaN })).toThrowError()
    expect(() => numberValidator({ value: undefined })).toThrowError()
    expect(() => numberValidator({ value: {} })).toThrowError()
    expect(() => numberValidator({ value: '1' })).toThrowError()
    expect(() => numberValidator({ value: true })).toThrowError()
  })

  it('validates real numbers or nulls', () => {
    expect(numberOrNullValidator({ value: 1 })).toBeUndefined()
    expect(numberOrNullValidator({ value: 0 })).toBeUndefined()
    expect(numberOrNullValidator({ value: 1.5 })).toBeUndefined()
    expect(numberOrNullValidator({ value: -1 })).toBeUndefined()
    expect(numberOrNullValidator({ value: null })).toBeUndefined()
    expect(() => numberOrNullValidator({ value: Infinity })).toThrowError()
    expect(() => numberOrNullValidator({ value: NaN })).toThrowError()
    expect(() => numberOrNullValidator({ value: undefined })).toThrowError()
    expect(() => numberOrNullValidator({ value: {} })).toThrowError()
    expect(() => numberOrNullValidator({ value: '1' })).toThrowError()
    expect(() => numberOrNullValidator({ value: true })).toThrowError()
  })

  it('validates integers', () => {
    expect(integerValidator({ value: 1 })).toBeUndefined()
    expect(integerValidator({ value: 0 })).toBeUndefined()
    expect(integerValidator({ value: -1 })).toBeUndefined()
    expect(() => integerValidator({ value: 1.5 })).toThrowError()
    expect(() => integerValidator({ value: null })).toThrowError()
    expect(() => integerValidator({ value: Infinity })).toThrowError()
    expect(() => integerValidator({ value: NaN })).toThrowError()
    expect(() => integerValidator({ value: undefined })).toThrowError()
    expect(() => integerValidator({ value: {} })).toThrowError()
    expect(() => integerValidator({ value: '1' })).toThrowError()
    expect(() => integerValidator({ value: true })).toThrowError()
  })

  it('validates integers or nulls', () => {
    expect(integerOrNullValidator({ value: 1 })).toBeUndefined()
    expect(integerOrNullValidator({ value: 0 })).toBeUndefined()
    expect(integerOrNullValidator({ value: -1 })).toBeUndefined()
    expect(integerOrNullValidator({ value: null })).toBeUndefined()
    expect(() => integerOrNullValidator({ value: 1.5 })).toThrowError()
    expect(() => integerOrNullValidator({ value: Infinity })).toThrowError()
    expect(() => integerOrNullValidator({ value: NaN })).toThrowError()
    expect(() => integerOrNullValidator({ value: undefined })).toThrowError()
    expect(() => integerOrNullValidator({ value: {} })).toThrowError()
    expect(() => integerOrNullValidator({ value: '1' })).toThrowError()
    expect(() => integerOrNullValidator({ value: true })).toThrowError()
  })

  it('validates positive integers', () => {
    expect(positiveIntegerValidator({ value: 1 })).toBeUndefined()
    expect(() => positiveIntegerValidator({ value: 0 })).toThrowError()
    expect(() => positiveIntegerValidator({ value: -1 })).toThrowError()
    expect(() => positiveIntegerValidator({ value: 1.5 })).toThrowError()
    expect(() => positiveIntegerValidator({ value: null })).toThrowError()
    expect(() => positiveIntegerValidator({ value: Infinity })).toThrowError()
    expect(() => positiveIntegerValidator({ value: NaN })).toThrowError()
    expect(() => positiveIntegerValidator({ value: undefined })).toThrowError()
    expect(() => positiveIntegerValidator({ value: {} })).toThrowError()
    expect(() => positiveIntegerValidator({ value: '1' })).toThrowError()
    expect(() => positiveIntegerValidator({ value: true })).toThrowError()
  })

  it('validates positive integers or nulls', () => {
    expect(positiveIntegerOrNullValidator({ value: 1 })).toBeUndefined()
    expect(positiveIntegerOrNullValidator({ value: null })).toBeUndefined()
    expect(() => positiveIntegerOrNullValidator({ value: 0 })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: -1 })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: 1.5 })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: Infinity })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: NaN })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: undefined })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: {} })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: '1' })).toThrowError()
    expect(() => positiveIntegerOrNullValidator({ value: true })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => numberValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => numberOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
    expect(() => integerValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => integerOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
    expect(() => positiveIntegerValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => positiveIntegerOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| object
|--------------------------------------------------------------------------
|
*/
describe('object validator', () => {
  it('validates objects', () => {
    expect(objectValidator({ value: {} })).toBeUndefined()
    expect(objectValidator({ value: { foo: 'bar' } })).toBeUndefined()
    expect(() => objectValidator({ value: null })).toThrowError()
    expect(() => objectValidator({ value: [] })).toThrowError()
    expect(() => objectValidator({ value: undefined })).toThrowError()
    expect(() => objectValidator({ value: () => null })).toThrowError()
    expect(() => objectValidator({ value: '' })).toThrowError()
    expect(() => objectValidator({ value: true })).toThrowError()
  })

  it('validates booleans or nulls', () => {
    expect(objectOrNullValidator({ value: {} })).toBeUndefined()
    expect(objectOrNullValidator({ value: { foo: 'bar' } })).toBeUndefined()
    expect(objectOrNullValidator({ value: null })).toBeUndefined()
    expect(() => objectOrNullValidator({ value: [] })).toThrowError()
    expect(() => objectOrNullValidator({ value: undefined })).toThrowError()
    expect(() => objectOrNullValidator({ value: () => null })).toThrowError()
    expect(() => objectOrNullValidator({ value: '' })).toThrowError()
    expect(() => objectOrNullValidator({ value: true })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => objectValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => objectOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| present
|--------------------------------------------------------------------------
|
*/
describe('present validator', () => {
  it('validates', () => {
    expect(presentValidator({ value: 'foo' })).toBeUndefined()
    expect(presentValidator({ value: null })).toBeUndefined()
    expect(presentValidator({ value: false })).toBeUndefined()
    expect(presentValidator({ value: 0 })).toBeUndefined()
    expect(() => presentValidator({ value: undefined })).toThrowError()
    expect(() => presentValidator({} as any)).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => presentValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| required
|--------------------------------------------------------------------------
|
*/
describe('required validator', () => {
  it('validates null and undefined', () => {
    expect(() => requiredValidator({ value: null, ...ctx })).toThrowError()
    expect(() => requiredValidator({ value: undefined, ...ctx })).toThrowError()
  })

  it('validates arrays', () => {
    expect(requiredValidator({ value: [1, 2, 3], ...ctx })).toBeUndefined()
    expect(() => requiredValidator({ value: [], ...ctx })).toThrowError()
  })

  it('validates booleans', () => {
    expect(requiredValidator({ value: true, ...ctx })).toBeUndefined()
    expect(() => requiredValidator({ value: false, ...ctx })).toThrowError()
  })

  it('validates numbers', () => {
    expect(requiredValidator({ value: 1, ...ctx })).toBeUndefined()
    expect(requiredValidator({ value: 0, ...ctx })).toBeUndefined()
    expect(requiredValidator({ value: 1.5, ...ctx })).toBeUndefined()
    expect(requiredValidator({ value: -1, ...ctx })).toBeUndefined()
    expect(() => requiredValidator({ value: Infinity, ...ctx })).toThrowError()
    expect(() => requiredValidator({ value: NaN, ...ctx })).toThrowError()
  })

  it('validates objects', () => {
    expect(requiredValidator({ value: {}, ...ctx })).toBeUndefined()
    expect(requiredValidator({ value: { foo: 'bar' }, ...ctx })).toBeUndefined()
  })

  it('validates strings', () => {
    expect(requiredValidator({ value: 'foo', ...ctx })).toBeUndefined()
    expect(requiredValidator({ value: ' ', ...ctx })).toBeUndefined()
    expect(() => requiredValidator({ value: '', ...ctx })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => requiredValidator({ value: null, ...ctx }, 'foo')).toThrowError('foo')
  })
})

/*
|--------------------------------------------------------------------------
| string
|--------------------------------------------------------------------------
|
*/
describe('string validator', () => {
  it('validates email addresses', () => {
    expect(emailValidator({ value: 'foo@bar.baz' })).toBeUndefined()
    expect(emailValidator({ value: 'foo@bar.baz.qux' })).toBeUndefined()
    expect(emailValidator({ value: 'foo.bar@baz.qux' })).toBeUndefined()
    expect(emailValidator({ value: 'a@b.c' })).toBeUndefined()
    expect(emailValidator({ value: '1@2.3' })).toBeUndefined()
    expect(() => emailValidator({ value: 'foo@bar' })).toThrowError()
    expect(() => emailValidator({ value: ' foo@bar.baz ' })).toThrowError()
    expect(() => emailValidator({ value: 'foo@bar.' })).toThrowError()
    expect(() => emailValidator({ value: 'foo@bar@baz.qux' })).toThrowError()
    expect(() => emailValidator({ value: '' })).toThrowError()
    expect(() => emailValidator({ value: ' ' })).toThrowError()
    expect(() => emailValidator({ value: null })).toThrowError()
    expect(() => emailValidator({ value: undefined })).toThrowError()
    expect(() => emailValidator({ value: {} })).toThrowError()
    expect(() => emailValidator({ value: 1 })).toThrowError()
    expect(() => emailValidator({ value: true })).toThrowError()
  })

  it('validates lowercased strings', () => {
    expect(lowercaseValidator({ value: 'foo', ...ctx })).toBeUndefined()
    expect(() => lowercaseValidator({ value: 'Foo', ...ctx })).toThrowError()
    expect(() => lowercaseValidator({ value: null, ...ctx })).toThrowError()
  })

  it('validates strings', () => {
    expect(stringValidator({ value: 'foo' })).toBeUndefined()
    expect(stringValidator({ value: ' ' })).toBeUndefined()
    expect(stringValidator({ value: '' })).toBeUndefined()
    expect(() => stringValidator({ value: null })).toThrowError()
    expect(() => stringValidator({ value: undefined })).toThrowError()
    expect(() => stringValidator({ value: {} })).toThrowError()
    expect(() => stringValidator({ value: 1 })).toThrowError()
    expect(() => stringValidator({ value: true })).toThrowError()
  })

  it('validates strings or nulls', () => {
    expect(stringOrNullValidator({ value: 'foo' })).toBeUndefined()
    expect(stringOrNullValidator({ value: ' ' })).toBeUndefined()
    expect(stringOrNullValidator({ value: '' })).toBeUndefined()
    expect(stringOrNullValidator({ value: null })).toBeUndefined()
    expect(() => stringOrNullValidator({ value: undefined })).toThrowError()
    expect(() => stringOrNullValidator({ value: {} })).toThrowError()
    expect(() => stringOrNullValidator({ value: 1 })).toThrowError()
    expect(() => stringOrNullValidator({ value: true })).toThrowError()
  })

  it('throws a custom error message', () => {
    expect(() => stringValidator({ value: null }, 'foo')).toThrowError('foo')
    expect(() => stringOrNullValidator({ value: undefined }, 'foo')).toThrowError('foo')
  })
})
